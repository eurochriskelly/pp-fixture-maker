import { Competition } from '@/lib/types';

export const generateCompetitionCode = (name: string): string => {
  // Try to use first letters of words, up to 2 characters
  const words = name.trim().split(/\s+/);
  if (words.length === 0) return 'XX';
  
  let code = '';
  for (const word of words) {
    if (code.length >= 2) break;
    const char = word[0]?.toUpperCase();
    if (char) code += char;
  }
  
  return code.padEnd(2, 'X').slice(0, 2).toUpperCase();
};

export const generateMatchIdsForCompetition = (competition: Competition): Map<string, string> => {
  const code = competition.code || generateCompetitionCode(competition.name);
  const idMap = new Map<string, string>();
  
  competition.fixtures.forEach((fixture, index) => {
    const number = String(index + 1).padStart(2, '0');
    idMap.set(fixture.id, `${code}.${number}`);
  });
  
  return idMap;
};
