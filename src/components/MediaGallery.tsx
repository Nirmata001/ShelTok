import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Download, 
  Play, 
  Image as ImageIcon, 
  Film, 
  ChevronLeft, 
  Trash2, 
  CheckCircle 
} from 'lucide-react';

interface MediaGalleryProps {
  blobs: any[];
  walletAddress: string;
  onClose: () => void;
  isConnected: boolean;
  onConnect: () => void;
  onDelete: (blob: any) => void;
  isEmbedded?: boolean;
}

const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'ogg'];

const getFileExtension = (fileName: string): string => {
  const lowercaseName = (fileName || '').toLowerCase();
  const prefixMatch = lowercaseName.match(/\.([a-z0-9]+):::/);
  if (prefixMatch) return prefixMatch[1];
  const suffixMatch = lowercaseName.match(/\.([a-z0-9]+)$/);
  if (suffixMatch) return suffixMatch[1];
  return 'mp4'; // Default fallback for video files
};

interface MediaItemProps {
  blob: any;
  walletAddress: string;
  onDownload: (blob: any) => void;
  onDelete: (blob: any) => void;
  key?: React.Key;
}

export const thumbnailCache: Record<string, string> = {};

export function preloadMediaGalleryThumbnails(blobs: any[], walletAddress: string) {
  if (!walletAddress) return;
  
  blobs.forEach(blob => {
    const fileName = blob.blobNameSuffix || '';
    const ext = getFileExtension(fileName);
    const isVideo = VIDEO_EXTENSIONS.includes(ext);
    const hasShelbyPubTag = fileName.startsWith('shelbypub/') || fileName.startsWith('sheltok/');
    
    if (isVideo && hasShelbyPubTag) {
      const cacheKey = blob.id || fileName;
      if (thumbnailCache[cacheKey]) return; // already cached, loading, or loaded
      
      // Mark as loading to prevent duplicate preloads
      thumbnailCache[cacheKey] = 'loading';
      
      const mediaUrl = `https://api.testnet.shelby.xyz/shelby/v1/blobs/${walletAddress}/${fileName}`;
      const video = document.createElement('video');
      video.src = mediaUrl;
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      video.currentTime = 0.1;

      const handleLoadedData = () => {
        video.currentTime = 0.1;
      };

      const handleSeeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 160;
        canvas.height = video.videoHeight || 90;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            thumbnailCache[cacheKey] = canvas.toDataURL();
          } catch (e) {
            console.error('Failed to pre-draw canvas:', e);
            thumbnailCache[cacheKey] = ''; // Reset on error so it can retry
          }
        } else {
          thumbnailCache[cacheKey] = '';
        }
        cleanup();
      };
      
      const handleError = () => {
        thumbnailCache[cacheKey] = '';
        cleanup();
      };

      const cleanup = () => {
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('seeked', handleSeeked);
        video.removeEventListener('error', handleError);
      };

      video.addEventListener('loadeddata', handleLoadedData);
      video.addEventListener('seeked', handleSeeked);
      video.addEventListener('error', handleError);
    }
  });
}

const MediaItem = ({ blob, walletAddress, onDownload, onDelete }: MediaItemProps) => {
  const fileName = blob.blobNameSuffix || '';
  const extension = getFileExtension(fileName);
  const isVideo = VIDEO_EXTENSIONS.includes(extension);
  const mediaUrl = `https://api.testnet.shelby.xyz/shelby/v1/blobs/${walletAddress}/${fileName}`;

  const cacheKey = blob.id || fileName;
  const isCached = thumbnailCache[cacheKey] && thumbnailCache[cacheKey].startsWith('data:');

  const [thumbnail, setThumbnail] = useState<string | null>(() => {
    if (isVideo && isCached) {
      return thumbnailCache[cacheKey];
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(() => {
    if (isVideo) {
      return !isCached;
    }
    return thumbnailCache[cacheKey] !== 'loaded';
  });

  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const currentCached = thumbnailCache[cacheKey];
    if (currentCached && currentCached.startsWith('data:')) {
      setThumbnail(currentCached);
      setIsLoading(false);
      return;
    }

    if (!isVideo && currentCached === 'loaded') {
      setIsLoading(false);
      return;
    }

    if (isVideo) {
      const video = document.createElement('video');
      video.src = mediaUrl;
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      video.currentTime = 0.1;

      const handleLoadedData = () => {
        video.currentTime = 0.1;
      };

      const handleSeeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 160;
        canvas.height = video.videoHeight || 90;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL();
          thumbnailCache[cacheKey] = dataUrl;
          setThumbnail(dataUrl);
        }
        setIsLoading(false);
      };

      video.addEventListener('loadeddata', handleLoadedData);
      video.addEventListener('seeked', handleSeeked);
      video.addEventListener('error', () => setIsLoading(false));

      return () => {
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('seeked', handleSeeked);
      };
    } else {
      setIsLoading(false);
    }
  }, [isVideo, mediaUrl, cacheKey]);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative aspect-square bg-surface-container-low rounded-xl overflow-hidden cursor-default group shadow-sm hover:shadow-md transition-all border border-outline-variant/30"
    >
      {isLoading && (
        <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-[#000000] overflow-hidden border border-white/5 z-20 transition-all duration-300">
          {/* Subtle slow ambient pulse wave */}
          <div className="absolute w-24 h-24 rounded-full border border-[#E11D48]/5 bg-transparent animate-ping" style={{ animationDuration: '3s' }} />
          
          <div className="flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
              {/* Custom micro spinning loader track */}
              <div className="w-8 h-8 rounded-full border-2 border-white/5 border-t-[#E11D48] animate-spin" />
            </div>
          </div>
        </div>
      )}

      {isVideo ? (
        <>
          {isHovered ? (
            <video 
              src={mediaUrl} 
              autoPlay 
              muted 
              loop 
              playsInline 
              className="w-full h-full object-cover"
            />
          ) : thumbnail ? (
            <img 
              src={thumbnail} 
              alt={fileName} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
              <Film className="w-8 h-8 text-on-surface-variant/20" />
            </div>
          )}
          {!isHovered && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
              <div className="w-12 h-12 bg-[#E11D48] rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6 text-white fill-white ml-1" />
              </div>
            </div>
          )}
        </>
      ) : (
        <img 
          src={mediaUrl} 
          alt={fileName} 
          className="w-full h-full object-cover"
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
          referrerPolicy="no-referrer"
        />
      )}
      
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-end items-center gap-2 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownload(blob);
          }}
          className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-md backdrop-blur-sm transition-all"
          title="Download"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(blob);
          }}
          className="p-1.5 bg-white/10 hover:bg-error/20 text-white hover:text-error rounded-md backdrop-blur-sm transition-all"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};

export default function MediaGallery({ 
  blobs, 
  walletAddress, 
  onClose, 
  isConnected, 
  onConnect, 
  onDelete,
  isEmbedded = false
}: MediaGalleryProps) {
  const [notification, setNotification] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  const triggerNotification = (message: string) => {
    setNotification({ show: true, message });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const mediaBlobs = blobs.filter(blob => {
    const fileName = blob.blobNameSuffix || '';
    const ext = getFileExtension(fileName);
    const isVideo = VIDEO_EXTENSIONS.includes(ext);
    const hasShelbyPubTag = fileName.startsWith('shelbypub/') || fileName.startsWith('sheltok/');
    return isVideo && hasShelbyPubTag;
  });

  const handleDownload = async (blob: any) => {
    const fileName = blob.blobNameSuffix;
    const url = `https://api.testnet.shelby.xyz/shelby/v1/blobs/${walletAddress}/${fileName}`;
    try {
      const response = await fetch(url);
      const data = await response.blob();
      const blobUrl = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      triggerNotification('Download successful');
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className={isEmbedded ? 'w-full h-full' : 'fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 bg-black/40 backdrop-blur-sm'} onClick={!isEmbedded ? onClose : undefined}>
      <motion.div 
        initial={isEmbedded ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={isEmbedded ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
        className={`${isEmbedded ? 'w-full h-full rounded-2xl' : 'w-full max-w-5xl max-h-[85vh] h-full rounded-[2.5rem] shadow-2xl'} bg-background flex flex-col relative overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="bg-surface-container-lowest sticky top-0 z-10 shadow-sm">
          <div className={`max-w-full ${isEmbedded ? 'px-6 py-3' : 'px-10 py-4'} flex items-center justify-between`}>
            <div className="flex items-center gap-4">
              {!isEmbedded && (
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-on-surface" />
                </button>
              )}
            </div>
            {!isEmbedded && (
              <button 
                onClick={onClose}
                className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-on-surface" />
              </button>
            )}
          </div>
        </header>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto p-6 [scrollbar-width:thin] [scrollbar-color:rgba(38,38,38,0.7)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-neutral-800/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
        {!isConnected ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-6 max-w-md mx-auto">
            <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center">
              <ImageIcon className="w-10 h-10 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tighter text-on-surface">Connect Wallet</h3>
              <p className="text-on-surface-variant font-medium mt-2">Please connect your wallet to view your posts.</p>
            </div>
          </div>
        ) : mediaBlobs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4 opacity-50">
            <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center">
              <ImageIcon className="w-10 h-10 text-on-surface-variant" />
            </div>
            <div>
              <h3 className="text-lg font-bold">No posts found</h3>
              <p className="text-sm">Upload some images or videos to see them here.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto">
            {mediaBlobs.map((blob, index) => (
              <MediaItem 
                key={blob.blobNameSuffix || index} 
                blob={blob} 
                walletAddress={walletAddress}
                onDownload={handleDownload}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 md:bottom-12 left-1/2 -translate-x-1/2 z-[120] bg-[#E11D48] text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-white/20 backdrop-blur-md"
          >
            <CheckCircle className="w-5 h-5" />
            <span className="font-bold text-sm tracking-tight">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
      </motion.div>
    </div>
  );
}
