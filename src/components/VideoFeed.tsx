import { useEffect, useState, useRef, MouseEvent, ChangeEvent, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  ChevronLeft,
  CheckCircle,
  Film
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabase';

interface VideoFeedProps {
  onClose: () => void;
  isEmbedded?: boolean;
  onFirstVideoReady?: () => void;
  videos?: any[];
  isLoadingVideos?: boolean;
  activeVideoIndex?: number;
  onActiveVideoIndexChange?: (index: number) => void;
  connectedAddress?: string;
  signAndSubmitTransaction?: any;
  isWalletConnected?: boolean;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onRefresh?: () => Promise<void> | void;
  isRefreshing?: boolean;
  feedFilter?: 'explore' | 'following';
}

interface VideoItemProps {
  video: any;
  isActive: boolean;
  shouldLoad: boolean;
  isMuted: boolean;
  onToggleMute: (e: MouseEvent) => void;
  onShowNotification: (message: string) => void;
  onUsernameClick: (walletAddress: string, e: MouseEvent) => void;
  onLoaded?: () => void;
  isLiked?: boolean;
  likesCount?: number;
  onToggleLike?: () => void;
  onDownload?: () => void;
  onCopyLink?: () => void;
  isFollowing?: boolean;
  onToggleFollow?: () => void;
}

const VideoItem = memo(({ 
  video, 
  isActive, 
  shouldLoad, 
  isMuted, 
  onToggleMute, 
  onShowNotification, 
  onUsernameClick, 
  onLoaded,
  isLiked = false,
  likesCount = 0,
  onToggleLike,
  onDownload,
  onCopyLink,
  isFollowing = false,
  onToggleFollow
}: VideoItemProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [duration, setDuration] = useState(0);
  const [urlIndex, setUrlIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'portrait' | 'landscape' | 'square'>('portrait');
  const seekBarRef = useRef<HTMLInputElement>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // iOS Safari blob URL workaround
  const isIOS = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }, []);

  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const blobUrlRef = useRef<string>('');

  useEffect(() => {
    const rawUrl = shouldLoad ? (video.urls[urlIndex] ?? '') : '';
    if (!rawUrl) { 
      setVideoSrc(null); 
      return; 
    }

    if (!isIOS) {
      setVideoSrc(rawUrl);
      return;
    }

    // iOS: fetch as blob to bypass Safari streaming requirements
    let cancelled = false;
    fetch(rawUrl)
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.arrayBuffer();
      })
      .then(buffer => {
        if (cancelled) return;
        const blob = new Blob([buffer], { type: 'video/mp4' });
        const newBlobUrl = URL.createObjectURL(blob);
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = newBlobUrl;
        setVideoSrc(newBlobUrl);
      })
      .catch((err) => {
        console.error('iOS Blob Fetch Error:', err);
        if (!cancelled) setVideoSrc(rawUrl);
      });

    return () => { cancelled = true; };
  }, [shouldLoad, urlIndex, isIOS, video.urls]);

  // Cleanup blob URL on unmount
  useEffect(() => () => {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
  }, []);

  useEffect(() => {
    const videoElem = videoRef.current;
    if (!videoElem) return;

    if (isActive) {
      const playPromise = videoElem.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          if (err.name !== 'AbortError') {
            console.log("Playback error:", err);
          }
        });
      }
      setIsPlaying(true);
    } else {
      videoElem.pause();
      setIsPlaying(false);
    }
  }, [isActive, videoSrc]); // Re-run when videoSrc changes (e.g. after blob load)

  useEffect(() => {
    const updateSeekBar = () => {
      const videoElem = videoRef.current;
      const seekBar = seekBarRef.current;
      if (videoElem && seekBar) {
        const cur = videoElem.currentTime;
        const dur = videoElem.duration || 1;
        seekBar.value = cur.toString();
        const percent = (cur / dur) * 100;
        seekBar.style.background = `linear-gradient(to right, rgba(255, 255, 255, 1) ${percent}%, transparent ${percent}%)`;
      }
      if (isPlaying) {
        animationFrameIdRef.current = requestAnimationFrame(updateSeekBar);
      }
    };

    if (isPlaying) {
      animationFrameIdRef.current = requestAnimationFrame(updateSeekBar);
    } else {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      updateSeekBar();
    }

    return () => {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isPlaying]);

  const togglePlay = () => {
    const videoElem = videoRef.current;
    if (!videoElem) return;

    if (isPlaying) {
      videoElem.pause();
      setIsPlaying(false);
    } else {
      const playPromise = videoElem.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          if (err.name !== 'AbortError') {
            console.log("Toggle play failed:", err);
          }
        });
      }
      setIsPlaying(true);
    }
  };

  const handleError = () => {
    if (urlIndex < video.urls.length - 1) {
      console.warn(`Gateway ${urlIndex} failed, trying next...`);
      setUrlIndex(prev => prev + 1);
    } else {
      console.error('All gateways failed for video:', video.rawName);
      setHasError(true);
      if (onLoaded) onLoaded();
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      if (seekBarRef.current) {
        seekBarRef.current.max = videoRef.current.duration.toString();
      }
      const { videoWidth, videoHeight } = videoRef.current;
      if (videoHeight > videoWidth) {
        setAspectRatio('portrait');
      } else if (videoWidth > videoHeight) {
        setAspectRatio('landscape');
      } else {
        setAspectRatio('square');
      }
    }
  };

  const handleSeek = (e: ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      const dur = videoRef.current.duration || 1;
      const percent = (time / dur) * 100;
      if (seekBarRef.current) {
        seekBarRef.current.value = time.toString();
        seekBarRef.current.style.background = `linear-gradient(to right, rgba(255, 255, 255, 1) ${percent}%, transparent ${percent}%)`;
      }
    }
  };

  return (
    <div className="relative h-full w-full bg-black flex items-center justify-center md:py-1 overflow-hidden snap-start">
      <div className="flex items-end md:space-x-4 space-x-0 justify-center relative w-full h-full max-h-[calc(100vh-25px)]">
        
        {/* Video Card Container */}
        <div className="video-container bg-tiktok-dark rounded-xl overflow-hidden relative flex items-center justify-center border-0 md:border border-white/10 w-full md:w-[320px] xl:w-[400px] h-full shadow-2xl relative">
          {shouldLoad ? (
            <>
              {(!isLoaded && !hasError) && (
                <div className="absolute inset-0 bg-white/5 animate-pulse z-10 pointer-events-none" />
              )}
              
              {hasError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-12 text-center bg-black/90">
                  <Film className="w-12 h-12 text-white/20 mb-4 animate-bounce" />
                  <p className="text-white/60 font-bold">Failed to load video</p>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  src={videoSrc || undefined}
                  className="absolute inset-0 w-full h-full object-cover"
                  loop
                  muted={isMuted}
                  playsInline
                  autoPlay={isActive}
                  preload={isActive ? "auto" : "metadata"}
                  style={{
                    transform: 'translateZ(0)',
                    willChange: 'transform',
                  }}
                  onClick={togglePlay}
                  onLoadedData={() => {
                    setIsLoaded(true);
                    if (onLoaded) onLoaded();
                  }}
                  onLoadedMetadata={handleLoadedMetadata}
                  onError={handleError}
                />
              )}

              {/* Seek Bar */}
              <div className="absolute bottom-0 left-0 right-0 z-[110] pointer-events-auto group/seekbar md:py-2 py-0">
                <input
                  ref={seekBarRef}
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.01"
                  defaultValue="0"
                  onChange={handleSeek}
                  className="w-full h-[3px] group-hover/seekbar:h-1.5 active:h-1.5 transition-all duration-300 bg-white/20 appearance-none cursor-pointer accent-tiktok-red m-0 block"
                />
              </div>

              {/* Overlay Controls */}
              <div className="absolute inset-0 flex flex-col justify-end pointer-events-none z-20">
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
                
                <div className="pl-2.5 pr-4 pb-4 md:pl-3 md:pr-5 md:pb-5 relative z-10 text-left pointer-events-auto">
                  <div className="font-bold text-base flex items-center gap-1.5 text-white mb-1.5 drop-shadow-md">
                    <span className="-ml-0.5 hover:underline cursor-pointer font-black" onClick={(e) => onUsernameClick?.(video.wallet_address, e)}>
                      @{video.wallet_address.slice(0, 6)}...{video.wallet_address.slice(-4)}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-white/60"></span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFollow?.();
                      }}
                      className={`text-xs font-black tracking-wide transition-all cursor-pointer ${isFollowing ? 'text-white/60 hover:text-white' : 'text-tiktok-red hover:brightness-110'}`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </div>
                  {video.description && (
                    <div className="text-sm line-clamp-2 text-white/95 font-semibold leading-relaxed mb-2 drop-shadow-md pr-6">
                      {video.description}
                    </div>
                  )}
                </div>
              </div>

              {!isPlaying && isLoaded && !hasError && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                  <div className="p-6 bg-black/45 backdrop-blur-sm rounded-full scale-95 transition-transform duration-300">
                    <Play className="w-12 h-12 text-white fill-white" />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full bg-white/5 animate-pulse" />
          )}
        </div>

        {/* RIGHT SIDE ENGAGEMENT BAR (Desktop) */}
        <div className="hidden md:flex flex-col items-center space-y-4 pb-2 z-30 pointer-events-auto">
          {/* Profile */}
          <div className="relative mb-2">
            <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-black flex items-center justify-center shadow-lg">
              <img
                alt="Creator Profile"
                className="w-full h-full object-cover"
                src={`https://api.dicebear.com/7.x/identicon/svg?seed=${video.wallet_address}`}
                referrerPolicy="no-referrer"
              />
            </div>
            {!isFollowing && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFollow?.();
                }}
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-tiktok-red hover:brightness-95 text-white rounded-full p-1 shadow-lg active:scale-95 transition-transform outline-none cursor-pointer flex items-center justify-center"
              >
                <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
              </button>
            )}
          </div>

          {/* Like */}
          <div className="flex flex-col items-center group">
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleLike?.(); }}
              className={`w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition active:scale-90 ${
                isLiked 
                  ? 'bg-tiktok-red/15 text-tiktok-red shadow-lg' 
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <svg className="w-7 h-7" fill={isLiked ? "currentColor" : "none"} stroke={isLiked ? "none" : "currentColor"} strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </button>
            <span className="text-xs font-bold mt-1 text-white/90">{likesCount || "0"}</span>
          </div>

          {/* Mute/Volume (in place of comments) */}
          <div className="flex flex-col items-center group">
            <button 
              onClick={onToggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition active:scale-90 ${
                isMuted 
                  ? 'bg-tiktok-red/20 text-tiktok-red border border-tiktok-red/30' 
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {isMuted ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6L4.5 9H1.5v6h3l4.5 3.75V5.25z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
              )}
            </button>
            <span className="text-[10px] font-bold mt-1 text-white/60">{isMuted ? 'MUTE' : 'SOUND'}</span>
          </div>

          {/* Download */}
          <div className="flex flex-col items-center group">
            <button 
              onClick={(e) => { e.stopPropagation(); onDownload?.(); }}
              className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center cursor-pointer transition active:scale-90 text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </button>
            <span className="text-[10px] font-bold mt-1 text-white/60">SAVE</span>
          </div>

          {/* Share */}
          <div className="flex flex-col items-center group">
            <button 
              onClick={(e) => { e.stopPropagation(); onCopyLink?.(); }}
              className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center cursor-pointer transition active:scale-90 text-white"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.733 8.267L11.733 4L20 12L11.733 20L11.733 15.867C5.067 15.867 2 20 2 20C2 13.067 5.067 8.267 11.733 8.267Z" />
              </svg>
            </button>
            <span className="text-[10px] font-bold mt-1 text-white/60">SHARE</span>
          </div>

          {/* Rotating vinyl */}
          <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center border border-white/20 animate-spin mt-1" style={{ animationDuration: '4s' }}>
            <img
              alt="album mini"
              className="w-6 h-6 rounded-full object-cover"
              src={`https://api.dicebear.com/7.x/identicon/svg?seed=${video.wallet_address}`}
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* RIGHT SIDE ENGAGEMENT BAR (Mobile Overlay) */}
        <div className="md:hidden absolute right-3 bottom-24 flex flex-col items-center space-y-4 z-30 pointer-events-auto">
          {/* Mobile Profile */}
          <div className="relative mb-1">
            <div className="w-11 h-11 rounded-full border-2 border-white overflow-hidden bg-black flex items-center justify-center shadow-lg">
              <img
                alt="Creator Profile"
                className="w-full h-full object-cover"
                src={`https://api.dicebear.com/7.x/identicon/svg?seed=${video.wallet_address}`}
                referrerPolicy="no-referrer"
              />
            </div>
            {!isFollowing && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFollow?.();
                }}
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-tiktok-red hover:brightness-95 text-white rounded-full p-0.5 shadow-lg active:scale-95 transition-transform outline-none cursor-pointer flex items-center justify-center"
              >
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
              </button>
            )}
          </div>

          {/* Mobile Like */}
          <div className="flex flex-col items-center">
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleLike?.(); }}
              className={`w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition active:scale-90 ${
                isLiked 
                  ? 'bg-tiktok-red text-white shadow-lg' 
                  : 'bg-black/40 text-white backdrop-blur-md border border-white/10'
              }`}
            >
              <svg className="w-6 h-6" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </button>
            <span className="text-[10px] font-bold mt-0.5 text-white drop-shadow-md">{likesCount || "0"}</span>
          </div>

          {/* Mobile Mute */}
          <div className="flex flex-col items-center">
            <button 
              onClick={onToggleMute}
              className={`w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition active:scale-90 ${
                isMuted 
                  ? 'bg-tiktok-red text-white shadow-lg' 
                  : 'bg-black/40 text-white backdrop-blur-md border border-white/10'
              }`}
            >
              {isMuted ? (
                <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6L4.5 9H1.5v6h3l4.5 3.75V5.25z" />
                </svg>
              ) : (
                <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
              )}
            </button>
            <span className="text-[9px] font-bold mt-0.5 text-white drop-shadow-md">{isMuted ? 'MUTED' : 'SOUND'}</span>
          </div>

          {/* Mobile Download */}
          <button 
            onClick={(e) => { e.stopPropagation(); onDownload?.(); }}
            className="w-11 h-11 bg-black/40 text-white backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center cursor-pointer transition active:scale-90"
          >
            <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </button>

          {/* Mobile Share */}
          <button 
            onClick={(e) => { e.stopPropagation(); onCopyLink?.(); }}
            className="w-11 h-11 bg-black/40 text-white backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center cursor-pointer transition active:scale-90"
          >
            <svg className="w-5.5 h-5.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.733 8.267L11.733 4L20 12L11.733 20L11.733 15.867C5.067 15.867 2 20 2 20C2 13.067 5.067 8.267 11.733 8.267Z" />
            </svg>
          </button>

          {/* Mini Album Rotating */}
          <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center border border-white/25 animate-spin" style={{ animationDuration: '4s' }}>
            <img
              alt="album mini"
              className="w-5.5 h-5.5 rounded-full object-cover"
              src={`https://api.dicebear.com/7.x/identicon/svg?seed=${video.wallet_address}`}
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

      </div>
    </div>
  );
});

VideoItem.displayName = 'VideoItem';

export default function VideoFeed({ 
  onClose, 
  isEmbedded, 
  onFirstVideoReady,
  videos: externalVideos, 
  isLoadingVideos, 
  activeVideoIndex: externalIndex = 0, 
  onActiveVideoIndexChange, 
  connectedAddress, 
  signAndSubmitTransaction, 
  isWalletConnected,
  isMuted: externalIsMuted,
  onToggleMute: externalOnToggleMute,
  onRefresh,
  isRefreshing,
  feedFilter
}: VideoFeedProps) {
  const [localIndex, setLocalIndex] = useState(externalIndex);
  const activeIndex = localIndex;

  const setActiveIndex = (index: number | ((prev: number) => number)) => {
    if (typeof index === 'function') {
      setLocalIndex(prev => {
        const next = index(prev);
        onActiveVideoIndexChange?.(next);
        return next;
      });
    } else {
      setLocalIndex(index);
      onActiveVideoIndexChange?.(index);
    }
  };

  const [localIsMuted, setLocalIsMuted] = useState(true);
  const isMuted = externalIsMuted !== undefined ? externalIsMuted : localIsMuted;
  const [notification, setNotification] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const containerRef = useRef<HTMLDivElement>(null);

  const shuffledVideos = externalVideos || [];

  useEffect(() => {
    if (externalIndex > 0 && containerRef.current) {
      const element = containerRef.current.children[externalIndex] as HTMLElement;
      if (element) {
        element.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }
  }, []);

  const [likedVideos, setLikedVideos] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('sheltok_liked_videos') || localStorage.getItem('shelbypub_liked_videos');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [likesCount, setLikesCount] = useState<Record<string, number>>({});

  const [followedUsers, setFollowedUsers] = useState<Record<string, boolean>>({});

  // Background fetch for Supabase likes & follows and user's specific status
  useEffect(() => {
    if (shuffledVideos.length === 0) return;

    if (!isSupabaseConfigured) {
      // In Fallback mode, default all like counts to our local state if liked
      const defaultCounts: Record<string, number> = {};
      shuffledVideos.forEach(v => {
        defaultCounts[v.id] = likedVideos[v.id] ? 1 : 0;
      });
      setLikesCount(defaultCounts);
      return;
    }

    const fetchSupabaseData = async () => {
      try {
        const videoIds = shuffledVideos.map(v => v.id);
        
        // 1. Fetch total like counts
        const { data: countData, error: countErr } = await supabase!
          .from('likes')
          .select('video_id')
          .in('video_id', videoIds);

        if (!countErr && countData) {
          const counts: Record<string, number> = {};
          videoIds.forEach(id => { counts[id] = 0; });
          countData.forEach(row => {
            if (row.video_id) {
              counts[row.video_id] = (counts[row.video_id] || 0) + 1;
            }
          });
          setLikesCount(counts);
        }

        // 2. Fetch specific user liked status
        if (connectedAddress) {
          const { data: userData, error: userErr } = await supabase!
            .from('likes')
            .select('video_id')
            .eq('wallet_address', connectedAddress)
            .in('video_id', videoIds);

          if (!userErr && userData) {
            const userLikes: Record<string, boolean> = {};
            videoIds.forEach(id => { userLikes[id] = false; });
            userData.forEach(row => {
              if (row.video_id) {
                userLikes[row.video_id] = true;
              }
            });
            setLikedVideos(userLikes);
          }

          // 3. Fetch user follows status
          const { data: followData, error: followErr } = await supabase!
            .from('follows')
            .select('following_address')
            .eq('follower_address', connectedAddress);

          if (!followErr && followData) {
            const followMap: Record<string, boolean> = {};
            followData.forEach(row => {
              if (row.following_address) {
                followMap[row.following_address] = true;
              }
            });
            setFollowedUsers(followMap);
          }
        }
      } catch (err) {
        console.error('Failed to load likes/follows from Supabase:', err);
      }
    };

    fetchSupabaseData();
  }, [shuffledVideos, connectedAddress, isSupabaseConfigured]);

  const isLoading = isLoadingVideos;
  const error = null;

  const triggerNotification = (message: string) => {
    setNotification({ show: true, message });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  useEffect(() => {
    if (!isLoading) {
      if (shuffledVideos.length === 0 || error) {
        onFirstVideoReady?.();
      }
    }
  }, [isLoading, shuffledVideos.length, error, onFirstVideoReady]);

  const handleToggleMute = (e: MouseEvent) => {
    e.stopPropagation();
    if (externalOnToggleMute) {
      externalOnToggleMute();
    } else {
      setLocalIsMuted(!isMuted);
    }
  };

  const isCurrentVideoLiked = useMemo(() => {
    const video = shuffledVideos[activeIndex];
    return video ? !!likedVideos[video.id] : false;
  }, [shuffledVideos, activeIndex, likedVideos]);

  const currentVideoLikesCount = useMemo(() => {
    const video = shuffledVideos[activeIndex];
    return video ? (likesCount[video.id] || 0) : 0;
  }, [shuffledVideos, activeIndex, likesCount]);

  const handleToggleLike = async () => {
    const video = shuffledVideos[activeIndex];
    if (!video) return;

    const isLiked = !!likedVideos[video.id];
    const newLikedState = !isLiked;

    // Optimistically update states
    setLikedVideos(prev => ({ ...prev, [video.id]: newLikedState }));
    setLikesCount(prev => ({
      ...prev,
      [video.id]: Math.max(0, (prev[video.id] || 0) + (newLikedState ? 1 : -1))
    }));

    if (!isSupabaseConfigured) {
      try {
        const stored = localStorage.getItem('sheltok_liked_videos') || localStorage.getItem('shelbypub_liked_videos');
        const parsed = stored ? JSON.parse(stored) : {};
        parsed[video.id] = newLikedState;
        localStorage.setItem('sheltok_liked_videos', JSON.stringify(parsed));
      } catch (err) {
        console.error(err);
      }
      return;
    }

    if (!connectedAddress) {
      triggerNotification("wallet connection required!");
      // Revert optimistic changes if not connected
      setLikedVideos(prev => ({ ...prev, [video.id]: isLiked }));
      setLikesCount(prev => ({
        ...prev,
        [video.id]: Math.max(0, (prev[video.id] || 0) + (isLiked ? 1 : -1))
      }));
      return;
    }

    try {
      if (newLikedState) {
        const { error: insertErr } = await supabase!
          .from('likes')
          .insert({
            video_id: video.id,
            wallet_address: connectedAddress
          });
        if (insertErr && insertErr.code !== '23505') throw insertErr;
      } else {
        const { error: deleteErr } = await supabase!
          .from('likes')
          .delete()
          .match({
            video_id: video.id,
            wallet_address: connectedAddress
          });
        if (deleteErr) throw deleteErr;
      }
    } catch (err) {
      console.error('Failed to toggle like on Supabase:', err);
      // Revert optimistic changes on failure
      setLikedVideos(prev => ({ ...prev, [video.id]: isLiked }));
      setLikesCount(prev => ({
        ...prev,
        [video.id]: Math.max(0, (prev[video.id] || 0) + (isLiked ? 1 : -1))
      }));
    }
  };

  const handleToggleFollow = async (targetAddress: string) => {
    if (!targetAddress) return;

    const currentlyFollowing = !!followedUsers[targetAddress];
    const nextFollowingState = !currentlyFollowing;

    // Optimistically update follow state
    setFollowedUsers(prev => ({ ...prev, [targetAddress]: nextFollowingState }));

    triggerNotification(
      nextFollowingState
        ? `Following @${targetAddress.slice(0, 6)}...${targetAddress.slice(-4)}`
        : `Unfollowed @${targetAddress.slice(0, 6)}...${targetAddress.slice(-4)}`
    );

    if (!isSupabaseConfigured) return;

    if (!connectedAddress) {
      triggerNotification("Wallet connection recommended to sync follows across devices");
      return;
    }

    try {
      if (nextFollowingState) {
        const { error: insertErr } = await supabase!
          .from('follows')
          .insert({
            follower_address: connectedAddress,
            following_address: targetAddress
          });
        if (insertErr && insertErr.code !== '23505') throw insertErr;
      } else {
        const { error: deleteErr } = await supabase!
          .from('follows')
          .delete()
          .match({
            follower_address: connectedAddress,
            following_address: targetAddress
          });
        if (deleteErr) throw deleteErr;
      }
    } catch (err) {
      console.error('Failed to toggle follow on Supabase:', err);
      // Revert on error
      setFollowedUsers(prev => ({ ...prev, [targetAddress]: currentlyFollowing }));
    }
  };

  const handleDownload = async () => {
    const video = shuffledVideos[activeIndex];
    if (!video) return;
    try {
      const downloadUrl = video.urls[0];
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Extract description from blob name and use as filename with .mp4 extension
      const description = video.file_name?.split(':::')?.[1] || 'video';
      const cleanName = description.trim() || 'sheltok-video';
      a.download = `${cleanName}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      triggerNotification('Download successful');
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleCopyLink = () => {
    const video = shuffledVideos[activeIndex];
    if (!video) return;
    const shareUrl = `${window.location.origin}/watch/${video.wallet_address}/${video.file_name}`;
    navigator.clipboard.writeText(shareUrl);
    triggerNotification('Link copied to clipboard');
  };

  const handleUsernameClick = (walletAddress: string, e: MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(walletAddress);
    triggerNotification(`Copied creator wallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0');
            setActiveIndex(index);
          }
        });
      },
      {
        threshold: 0.8,
        rootMargin: '0px'
      }
    );

    const elements = containerRef.current?.querySelectorAll(':scope > .snap-start');
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [shuffledVideos]);

  useEffect(() => {
    if (shuffledVideos.length > 0 && containerRef.current && !isLoading) {
      containerRef.current.focus();
    }
  }, [isLoading, shuffledVideos.length]);

  const scrollToNext = () => {
    if (!containerRef.current || shuffledVideos.length === 0) return;
    if (activeIndex < shuffledVideos.length - 1) {
      const nextIndex = activeIndex + 1;
      const nextElement = containerRef.current.children[nextIndex] as HTMLElement;
      if (nextElement) {
        containerRef.current.scrollTo({
          top: nextElement.offsetTop,
          behavior: 'smooth'
        });
      }
    }
  };

  const scrollToPrev = () => {
    if (!containerRef.current || shuffledVideos.length === 0) return;
    if (activeIndex > 0) {
      const prevIndex = activeIndex - 1;
      const prevElement = containerRef.current.children[prevIndex] as HTMLElement;
      if (prevElement) {
        containerRef.current.scrollTo({
          top: prevElement.offsetTop,
          behavior: 'smooth'
        });
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current || shuffledVideos.length === 0) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        scrollToNext();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollToPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, shuffledVideos.length]);

  // Listen to custom scroll event requests from other components/views
  useEffect(() => {
    const handleScrollPrevRequest = () => {
      scrollToPrev();
    };
    const handleScrollNextRequest = () => {
      scrollToNext();
    };

    window.addEventListener('feed-scroll-prev', handleScrollPrevRequest);
    window.addEventListener('feed-scroll-next', handleScrollNextRequest);

    const handleToastRequest = (e: Event) => {
      const msg = (e as CustomEvent).detail;
      if (msg) triggerNotification(msg);
    };
    window.addEventListener('toast', handleToastRequest);

    return () => {
      window.removeEventListener('feed-scroll-prev', handleScrollPrevRequest);
      window.removeEventListener('feed-scroll-next', handleScrollNextRequest);
      window.removeEventListener('toast', handleToastRequest);
    };
  }, [activeIndex, shuffledVideos.length]);

  return (
    <div 
      className={`${isEmbedded ? 'relative h-full' : 'fixed inset-0 z-[100] h-[calc(100dvh-64px)] md:h-[100dvh]'} bg-black flex justify-center overflow-hidden`}
    >
      {/* Header */}
      {!isEmbedded && (
        <div className="absolute top-0 left-0 right-0 z-[110] p-6 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 text-white font-bold hover:text-[#E11D48] transition-colors outline-none focus:outline-none"
          >
            <ChevronLeft className="w-6 h-6" />
            <span>Back to Storage</span>
          </button>
          <div className="bg-[#E11D48] text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
            For You
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 w-full h-full flex items-center justify-center md:py-1 overflow-hidden">
          <div className="flex items-end md:space-x-4 space-x-0 justify-center relative w-full h-full max-h-[calc(100vh-25px)]">
            <div className="bg-white/5 animate-pulse rounded-xl w-full md:w-[320px] xl:w-[400px] h-full"></div>
            <div className="hidden md:flex flex-col items-center space-y-5 pb-2 z-30">
              <div className="w-12 h-12 rounded-full bg-white/5 animate-pulse mb-2"></div>
              <div className="w-12 h-12 rounded-full bg-white/5 animate-pulse"></div>
              <div className="w-12 h-12 rounded-full bg-white/5 animate-pulse"></div>
              <div className="w-12 h-12 rounded-full bg-white/5 animate-pulse"></div>
              <div className="w-12 h-12 rounded-full bg-white/5 animate-pulse"></div>
              <div className="w-12 h-12 rounded-full bg-white/5 animate-pulse"></div>
            </div>
          </div>
        </div>
      ) : shuffledVideos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-12 text-center">
          <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center">
            <Play className="w-10 h-10 text-white/20" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              {feedFilter === 'following' ? 'No creators followed yet' : 'No videos yet'}
            </h2>
            <p className="text-white/40 mt-2">
              {feedFilter === 'following' 
                ? 'Follow some creators to see their videos here!' 
                : 'Be the first to upload a video to ShelTok!'}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className={`relative flex ${isEmbedded ? 'h-full' : 'h-[calc(100dvh-64px)] md:h-[100dvh]'} w-full md:max-w-[400px] xl:max-w-[480px] flex-col overflow-y-scroll overflow-x-hidden snap-y snap-mandatory scrollbar-none outline-none overflow-hidden`} ref={containerRef} style={{
            scrollSnapType: 'y mandatory',
            overflowY: 'scroll',
            scrollbarWidth: 'none',
            overscrollBehaviorY: 'contain',
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'auto',
            touchAction: 'pan-y',
          }}>
            {shuffledVideos.map((video, index) => (
              <div 
                key={`${video.id}-${index}`} 
                data-index={index} 
                className='relative bg-black snap-start flex-shrink-0'
                style={{
                  height: isEmbedded ? '100%' : (typeof window !== 'undefined' && window.innerWidth < 768 ? 'calc(100dvh - 64px)' : '100dvh'),
                  width: '100%',
                  scrollSnapStop: 'always',
                  contain: 'strict',
                  flexShrink: 0,
                }}
              >
                <VideoItem 
                  video={video} 
                  isActive={activeIndex === index} 
                  shouldLoad={Math.abs(activeIndex - index) <= 1}
                  isMuted={isMuted}
                  onToggleMute={handleToggleMute}
                  onShowNotification={triggerNotification}
                  onUsernameClick={handleUsernameClick}
                  onLoaded={index === 0 ? onFirstVideoReady : undefined}
                  isLiked={!!likedVideos[video.id]}
                  likesCount={likesCount[video.id] || 0}
                  onToggleLike={handleToggleLike}
                  onDownload={handleDownload}
                  onCopyLink={handleCopyLink}
                  isFollowing={!!followedUsers[video.wallet_address]}
                  onToggleFollow={() => handleToggleFollow(video.wallet_address)}
                />
              </div>
            ))}
          </div>
        </>
      )}

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

      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          opacity: 0;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
          transform: scale(0.5);
        }
        .group\\/seekbar:active input[type=range]::-webkit-slider-thumb {
          opacity: 1;
          transform: scale(1);
        }
        input[type=range]::-moz-range-thumb {
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          opacity: 0;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          border: none;
          transform: scale(0.5);
        }
        .group\\/seekbar:active input[type=range]::-moz-range-thumb {
          opacity: 1;
          transform: scale(1);
        }
      `}} />
    </div>
  );
}
