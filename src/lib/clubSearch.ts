import { Club } from './types';

export interface ClubSearchResult {
  name?: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  website?: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  abbreviation?: string;
  code?: string;
}

const SYSTEM_PROMPT = `You are a helpful assistant that finds details about sports clubs.

STRICT INSTRUCTIONS:
1. Return a JSON object with the following fields:
   - name: Official club name
   - address: Full postal address
   - coordinates: { lat: number, lng: number } (approximate location of home ground/clubhouse)
   - website: URL
   - email: Contact email (if available)
   - phone: Contact phone (if available)
   - logoUrl: URL to the club's crest/logo (Must be a direct link to a transparent PNG or SVG if possible).
   - primaryColor: Hex code for primary kit color
   - secondaryColor: Hex code for secondary kit color
   - abbreviation: Short code (max 5 chars, e.g. ARSNL)
   - code: Very short code (2 chars, e.g. AR)

2. DO NOT HALLUCINATE OR GUESS. 
   - If you cannot find a specific address, leave the 'address' field null.
   - If you cannot find the coordinates, leave the 'coordinates' field null.
   - If you cannot find a contact email, leave 'email' null.
   - If you are unsure about the club (e.g. it might not exist or is ambiguous), return an empty JSON object {}.

3. WEBSITE & LOGO:
   - The 'website' field is critical. Please find the official club website.
   - For 'logoUrl', prioritize Wikimedia/Wikipedia URLs or official club website URLs. 
   - If you cannot find a logo URL, leave it null. Do not invent one.

Ensure valid JSON output. Do not include markdown formatting (like \`\`\`json).`;

export async function searchClubInfo(clubName: string, apiKey: string): Promise<ClubSearchResult> {
  // Auto-detect provider based on key prefix
  const isOpenAI = apiKey.startsWith('sk-proj-') || apiKey.startsWith('sk-');
  const isOpenRouter = apiKey.startsWith('sk-or-');
  
  // Default to OpenRouter if ambiguous, but prefer OpenAI if it looks like an OpenAI key
  // OpenRouter keys usually start with 'sk-or-v1-'
  // OpenAI keys usually start with 'sk-' (older) or 'sk-proj-' (newer)
  
  const provider = isOpenRouter ? 'openrouter' : 'openai';
  
  const baseUrl = provider === 'openai' 
    ? 'https://api.openai.com/v1/chat/completions' 
    : 'https://openrouter.ai/api/v1/chat/completions';

  const model = provider === 'openai' ? 'gpt-4o' : 'perplexity/sonar';

  console.log(`Searching for "${clubName}" using ${provider} with model ${model}...`);

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(provider === 'openrouter' && {
          'HTTP-Referer': 'https://pitchperfect.eu.com', 
          'X-Title': 'PP Fixture Maker'
        })
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Find details for the sports club: "${clubName}".` }
        ],
        // Perplexity doesn't support response_format: json_object strictly like OpenAI, 
        // but it usually adheres to instructions. We might need to relax this for Perplexity or parse strictly.
        // let's try removing response_format for perplexity or openrouter in general to be safe, 
        // as some openrouter models error on it.
        ...(provider === 'openai' ? { response_format: { type: "json_object" } } : {})
      })
    });

    if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
        try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.error?.message) {
                errorMessage = errorJson.error.message;
            }
        } catch (e) {
            // Ignore JSON parse error, stick with status text or raw text
            if (errorText.length < 200) errorMessage += ` - ${errorText}`;
        }
        throw new Error(errorMessage);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content received from AI');
    }

    // Clean markdown if present
    const cleaned = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    
    const result = JSON.parse(cleaned) as ClubSearchResult;

    // Enhance: If website found but no logo, try fallbacks
    if (result.website && !result.logoUrl) {
      try {
        const url = new URL(result.website);
        // Strategy 1: Clearbit (Best for tech/major companies, hit or miss for local clubs)
        // Strategy 2: Google Favicon (Reliable but sometimes small/low res)
        
        // We will return the Clearbit one as primary candidate, 
        // but the UI 'processLogo' might fail on it if it doesn't exist.
        // Ideally we would check if it exists (HEAD request), but that adds latency.
        // Let's try Google High Res Favicon first as it's often more reliable for smaller sites.
        
        result.logoUrl = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=256`;
      } catch (e) {
        // invalid url, ignore
      }
    }

    return result;
  } catch (error) {
    console.error('Club search failed:', error);
    throw error;
  }
}

export async function processLogo(imageUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous"; // Try to handle CORS
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                // If canvas context fails, maybe just resolve with the original URL?
                // The UI can try to display it directly.
                console.warn('Canvas context unavailable, returning raw URL');
                resolve(imageUrl);
                return;
            }

            // Target size
            const size = 256;
            canvas.width = size;
            canvas.height = size;

            // Clear background (transparent)
            ctx.clearRect(0, 0, size, size);

            // Calculate scaling to fit within (leaving padding)
            const padding = 28;
            const maxDim = size - (padding * 2);
            
            // Handle tiny images (don't upscale too much if they are pixelated favicons)
            // But usually we want them centered.
            const scale = Math.min(maxDim / img.width, maxDim / img.height);
            
            const drawWidth = img.width * scale;
            const drawHeight = img.height * scale;
            
            // Center the image
            const x = (size - drawWidth) / 2;
            const y = (size - drawHeight) / 2;

            ctx.drawImage(img, x, y, drawWidth, drawHeight);

            try {
                const dataUrl = canvas.toDataURL('image/png');
                resolve(dataUrl);
            } catch (e) {
                // If CORS fails here (tainted canvas), we MUST fallback to the raw URL.
                // The UI will try to display it as an <img> tag.
                console.warn('Canvas export failed (likely CORS), returning raw URL', e);
                resolve(imageUrl);
            }
        };

        img.onerror = () => {
            // If the image fails to load entirely, we can't do anything.
            reject(new Error(`Failed to load image from ${imageUrl}`));
        };

        // If it's a direct URL, we might run into CORS. 
        // Google Favicon service sets proper CORS headers so it should work fine.
        // Wikipedia/Wikimedia also usually sets CORS headers.
        img.src = imageUrl;
    });
}
