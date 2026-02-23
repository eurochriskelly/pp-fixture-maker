import React, { useEffect, useState } from 'react';
import { getImage, isIndexedDBUrl } from '@/lib/imageStore';

interface CrestImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  fallback?: React.ReactNode;
}

/**
 * A smart image component that handles:
 * - idb:// URLs (fetches from IndexedDB)
 * - http:// or https:// URLs (displays directly)
 * - data:image/... URLs (displays directly)
 * - Empty/null values (shows fallback or nothing)
 * 
 * Automatically manages object URL lifecycle for IndexedDB images.
 */
export const CrestImage: React.FC<CrestImageProps> = ({
  src,
  fallback,
  className,
  alt = '',
  ...props
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) {
      setImageUrl(null);
      return;
    }

    // If it's already a data URL or http URL, use it directly
    if (!isIndexedDBUrl(src)) {
      setImageUrl(src);
      return;
    }

    // It's an idb:// URL, need to fetch from IndexedDB
    let objectUrl: string | null = null;
    setIsLoading(true);
    setError(false);

    const loadImage = async () => {
      try {
        objectUrl = await getImage(src);
        if (objectUrl) {
          setImageUrl(objectUrl);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Failed to load image from IndexedDB:', err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();

    // Cleanup: revoke object URL when component unmounts or src changes
    return () => {
      if (objectUrl && objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  if (!src || error) {
    return fallback ? <>{fallback}</> : null;
  }

  if (isLoading) {
    return (
      <div 
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.05)',
          ...props.style
        }}
      >
        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl || ''}
      alt={alt}
      className={className}
      {...props}
      onError={(e) => {
        setError(true);
        props.onError?.(e);
      }}
    />
  );
};

export default CrestImage;
