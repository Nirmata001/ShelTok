/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AptosWalletAdapterProvider, useWallet } from '@aptos-labs/wallet-adapter-react';
import { Network, AccountAddress } from '@aptos-labs/ts-sdk';
import { ShelbyBlobClient } from '@shelby-protocol/sdk/browser';
import { encodeFile, createRegisterBlobPayload, aptosClient, uploadBlobToRpc } from './services/shelbyService';
import { supabase, isSupabaseConfigured } from './services/supabase';
import VideoFeed from './components/VideoFeed';
import MediaGallery, { preloadMediaGalleryThumbnails } from './components/MediaGallery';
import UploadPage from './components/UploadPage';
import { useQuery } from '@tanstack/react-query';
import { useShelbyClient } from '@shelby-protocol/react';
import { Order_By } from '@shelby-protocol/sdk/browser';
import { 
  ChevronDown, 
  ChevronUp, 
  Home, 
  Plus as Add, 
  Video as VideoLibrary,
  Smartphone,
  Sparkles
} from 'lucide-react';

// Modular Components
import InstallBanner from './components/InstallBanner';
import WalletModal from './components/WalletModal';
import DeleteModal from './components/DeleteModal';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import NotificationToast from './components/NotificationToast';

const getFileExtension = (fileName: string): string => {
  const lowercaseName = (fileName || '').toLowerCase();
  const prefixMatch = lowercaseName.match(/\.([a-z0-9]+):::/);
  if (prefixMatch) return prefixMatch[1];
  const suffixMatch = lowercaseName.match(/\.([a-z0-9]+)$/);
  if (suffixMatch) return suffixMatch[1];
  return 'mp4'; // Default fallback
};

function ShelbyApp() {
  const { connected, account, connect, disconnect, wallets, signAndSubmitTransaction } = useWallet();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const shelbyClientInstance = useShelbyClient();
  const shelbyClient = shelbyClientInstance;
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const hasShuffled = useRef(false);
  const shuffledVideosRef = useRef<any[]>([]);

  // React Query fetch global video feed
  const { data: globalBlobs, isLoading: blobsLoading, refetch, isFetching: blobsFetching } = useQuery({
    queryKey: ['globalBlobs'],
    queryFn: async () => {
      return await shelbyClient.coordination.getBlobs({
        where: {
          is_written: { _eq: 1 as any },
          _or: [
            { blob_name: { _ilike: '%shelbypub/%:::%' } },
            { blob_name: { _ilike: '%sheltok/%:::%' } }
          ]
        },
        pagination: { limit: 100 },
        orderBy: [{ updated_at: Order_By.Desc }] as any
      });
    },
    refetchInterval: 30000,
    staleTime: 25000,
  });

  const feedVideos = useMemo(() => {
    if (!globalBlobs) return shuffledVideosRef.current;

    const blobList = Array.isArray(globalBlobs)
      ? globalBlobs
      : (globalBlobs as any).blobs || (globalBlobs as any).hits || [];

    const processed = blobList.map((b: any) => {
      const fullBlobName = b.blob_name || b.blobNameSuffix || b.name || '';
      let owner = b.owner || b.address || '0x0';
      owner = owner.toString().replace(/^@/, '');
      if ((!fullBlobName.includes('shelbypub/') && !fullBlobName.includes('sheltok/')) || !fullBlobName.includes(':::')) return null;
      const descParts = fullBlobName.split(':::');
      const description = descParts[1] || '';
      const gateways = ['https://api.testnet.shelby.xyz/shelby'];
      const variants = [owner];
      if (owner.startsWith('0x')) {
        const clean = owner.replace(/^0x/, '');
        if (clean.length === 64) {
          const short = '0x' + clean.replace(/^0+/, '');
          if (short !== owner) variants.push(short);
        } else {
          const long = '0x' + clean.padStart(64, '0');
          if (long !== owner) variants.push(long);
        }
      }
      const urls = gateways.flatMap(base =>
        variants.map(v => `${base}/v1/blobs/${v}/${fullBlobName}`)
      );
      return { id: b.id || fullBlobName, rawName: fullBlobName, urls, wallet_address: owner, file_name: fullBlobName, description };
    }).filter(Boolean);

    if (!hasShuffled.current && processed.length > 0) {
      const arr = [...processed];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      shuffledVideosRef.current = arr;
      hasShuffled.current = true;
      return arr;
    }

    if (hasShuffled.current && processed.length > shuffledVideosRef.current.length) {
      const existingIds = new Set(shuffledVideosRef.current.map((v: any) => v.id));
      const newVideos = processed.filter((v: any) => !existingIds.has(v.id));
      shuffledVideosRef.current = [...shuffledVideosRef.current, ...newVideos];
    }

    return shuffledVideosRef.current;
  }, [globalBlobs]);

  // View Routing states
  const [isUploadPageOpen, setIsUploadPageOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isMediaGalleryOpen, setIsMediaGalleryOpen] = useState(false);
  const [isVideoFeedOpen, setIsVideoFeedOpen] = useState(true);
  const [feedFilter, setFeedFilter] = useState<'explore' | 'following'>('explore');
  const [isFeedMuted, setIsFeedMuted] = useState(true);
  const [followedUsers, setFollowedUsers] = useState<Record<string, boolean>>({});

  // Account specific uploads state
  const [blobs, setBlobs] = useState<any[]>([]);
  const [isLoadingBlobs, setIsLoadingBlobs] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isEncoding, setIsEncoding] = useState(false);
  const [explorerLink, setExplorerLink] = useState<string | null>(null);
  const [videoDescription, setVideoDescription] = useState('');

  // Overlay / Modal Interaction states
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [blobToDelete, setBlobToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteSuccessModalOpen, setIsDeleteSuccessModalOpen] = useState(false);
  
  // PWA & Toasts
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [notification, setNotification] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  // Refs
  const walletRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch followed creators
  useEffect(() => {
    const walletAddress = account?.address?.toString();
    if (!walletAddress || !isSupabaseConfigured) {
      setFollowedUsers({});
      return;
    }

    const fetchFollows = async () => {
      try {
        const { data, error } = await supabase!
          .from('follows')
          .select('following_address')
          .eq('follower_address', walletAddress);

        if (!error && data) {
          const followMap: Record<string, boolean> = {};
          data.forEach(row => {
            if (row.following_address) {
              followMap[row.following_address] = true;
            }
          });
          setFollowedUsers(followMap);
        }
      } catch (err) {
        console.error('Error fetching follows from Supabase:', err);
      }
    };

    fetchFollows();
  }, [account?.address]);

  const filteredFeedVideos = useMemo(() => {
    if (feedFilter === 'explore') return feedVideos;
    return feedVideos.filter(v => !!followedUsers[v.wallet_address]);
  }, [feedVideos, feedFilter, followedUsers]);

  const triggerNotification = (message: string) => {
    setNotification({ show: true, message });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const handleRefreshFeed = async () => {
    hasShuffled.current = false;
    setActiveVideoIndex(0);
    await refetch();
    triggerNotification("Feed refreshed!");
  };

  // Upload view preview generation
  useEffect(() => {
    if (!selectedFile) {
      setVideoPreviewUrl(null);
      return;
    }

    const isVideo = selectedFile.type.startsWith('video/') || ['mp4', 'webm', 'mov', 'ogg'].includes(getFileExtension(selectedFile.name));
    if (isVideo) {
      const url = URL.createObjectURL(selectedFile);
      setVideoPreviewUrl(url);
      
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setVideoPreviewUrl(null);
    }
  }, [selectedFile]);

  // Mobile setup
  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth < 768) {
        setIsVideoFeedOpen(true);
      }
    };
    checkMobile();
  }, []);

  // Clean upload state on exit
  useEffect(() => {
    if (!isUploadPageOpen) {
      setExplorerLink(null);
      setSelectedFile(null);
      setIsDragging(false);
      setVideoDescription('');
    }
  }, [isUploadPageOpen]);

  // Handle outside clicks for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (walletRef.current && !walletRef.current.contains(event.target as Node)) {
        setIsWalletDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Fetch current user's uploaded blobs
  const fetchBlobs = async () => {
    if (account?.address) {
      try {
        setIsLoadingBlobs(true);
        const accountAddress = AccountAddress.fromString(account.address.toString());
        const response = await shelbyClient.coordination.getAccountBlobs({ 
          account: accountAddress 
        });
        
        let accountBlobs: any[] = [];
        if (Array.isArray(response)) {
          accountBlobs = response;
        } else if (response && typeof response === 'object') {
          accountBlobs = (response as any).blobs || (response as any).data || [];
        }
          
        const videoShelbyPubBlobs = accountBlobs.filter((blob) => {
          const fileName = blob.blobNameSuffix || '';
          const ext = getFileExtension(fileName);
          const isVideo = ['mp4', 'webm', 'mov', 'ogg'].includes(ext);
          const hasShelbyPubTag = fileName.startsWith('shelbypub/') || fileName.startsWith('sheltok/');
          return isVideo && hasShelbyPubTag;
        });

        const sortedBlobs = [...videoShelbyPubBlobs].sort((a, b) => {
          const timeA = Number(a.creationMicros || 0);
          const timeB = Number(b.creationMicros || 0);
          return timeB - timeA;
        });
        
        setBlobs(sortedBlobs);
      } catch (error) {
        console.error('Failed to fetch blobs:', error);
        setBlobs([]);
      } finally {
        setIsLoadingBlobs(false);
      }
    }
  };

  useEffect(() => {
    if (account?.address) {
      fetchBlobs();
    } else {
      setBlobs([]);
    }
  }, [account?.address]);

  // Background thumbnail preloader for Media Gallery
  useEffect(() => {
    if (account?.address && blobs.length > 0) {
      preloadMediaGalleryThumbnails(blobs, account.address.toString());
    }
  }, [blobs, account?.address]);

  // Start new video upload
  const handleStartUpload = async () => {
    if (!selectedFile || !account) {
      if (!account) alert('Please connect your wallet first.');
      return;
    }

    try {
      setIsEncoding(true);
      setExplorerLink(null);
      
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const description = videoDescription || '';
      const fileExt = selectedFile.name.split('.').pop() || 'mp4';
      const blobName = `sheltok/${timestamp}_${randomId}.${fileExt}:::${description}`;
      
      const commitments = await encodeFile(selectedFile);
      const payload = createRegisterBlobPayload(
        account.address.toString(),
        blobName,
        commitments
      );

      const transactionSubmitted = await (signAndSubmitTransaction as any)({
        data: payload,
      });

      await aptosClient.waitForTransaction({
        transactionHash: transactionSubmitted.hash,
      });

      await uploadBlobToRpc(account.address.toString(), selectedFile, blobName);
      await fetchBlobs();

      setExplorerLink(`https://explorer.shelby.xyz/testnet/account/${account.address.toString()}`);
      setSelectedFile(null);
      setVideoDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      triggerNotification('Upload successful');
    } catch (error) {
      console.error('Upload process failed:', error);
    } finally {
      setIsEncoding(false);
    }
  };

  // Download media blob
  const handleDownload = async (filename: string) => {
    if (!account?.address) {
      alert('Please connect your wallet first.');
      return;
    }
    
    const walletAddress = account.address.toString();
    const downloadUrl = `https://api.testnet.shelby.xyz/shelby/v1/blobs/${walletAddress}/${filename}`;
    
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const description = filename.split(':::')?.[1] || '';
      const ext = getFileExtension(filename);
      const cleanName = description.trim() || filename.split(':::')?.[0]?.split('/')?.pop() || 'shelby-file';
      const cleanBaseName = cleanName.endsWith(`.${ext}`) ? cleanName.slice(0, -(ext.length + 1)) : cleanName;
      a.download = `${cleanBaseName}.${ext}`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      triggerNotification('Download successful');
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file.');
    }
  };

  const handleDeleteBlob = (blob: any) => {
    setBlobToDelete(blob);
    setIsDeleteModalOpen(true);
  };

  // Delete video blob
  const confirmDeleteBlob = async () => {
    if (!account || !account.address || !blobToDelete) return;

    try {
      setIsDeleting(true);
      const payload = ShelbyBlobClient.createDeleteBlobPayload({
        account: AccountAddress.fromString(account.address.toString()),
        blobName: blobToDelete.blobNameSuffix
      } as any);
      
      const response = await (signAndSubmitTransaction as any)({ data: payload });
      await aptosClient.waitForTransaction({ transactionHash: response.hash });

      await fetchBlobs();
      setIsDeleteModalOpen(false);
      setBlobToDelete(null);
      setIsDeleteSuccessModalOpen(true);
    } catch (error) {
      console.error('Failed to delete blob:', error);
      alert('Failed to delete file. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // PWA Banner support
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const isDismissed = sessionStorage.getItem('pwa-install-dismissed');
      if (!isDismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleSidebarNavigate = (view: 'explore' | 'following' | 'posts' | 'live' | 'upload') => {
    if (view === 'explore') {
      setFeedFilter('explore');
      setIsVideoFeedOpen(true);
      setIsMediaGalleryOpen(false);
      setIsUploadPageOpen(false);
    } else if (view === 'following') {
      setFeedFilter('following');
      setIsVideoFeedOpen(true);
      setIsMediaGalleryOpen(false);
      setIsUploadPageOpen(false);
    } else if (view === 'posts') {
      setIsMediaGalleryOpen(true);
      setIsVideoFeedOpen(false);
      setIsUploadPageOpen(false);
    } else if (view === 'live') {
      setIsVideoFeedOpen(true);
      setIsMediaGalleryOpen(false);
      setIsUploadPageOpen(false);
      window.dispatchEvent(new CustomEvent('toast', { detail: "LIVE Stream coming soon!" }));
    } else if (view === 'upload') {
      setIsUploadPageOpen(true);
      setIsVideoFeedOpen(false);
      setIsMediaGalleryOpen(false);
    }
  };

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black text-white flex flex-col items-center justify-center p-6 select-none overflow-hidden font-sans">
        {/* Background radial soft ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-xs w-full text-center flex flex-col items-center"
        >
          {/* Custom Logo/Branding Header */}
          <div className="mb-12 flex items-center gap-2.5">
            <div className="bg-white/5 border border-white/10 p-2 rounded-xl flex items-center justify-center shadow-md">
              <img 
                src="/logo_custom.png" 
                alt="ShelTok Logo" 
                className="w-8 h-8 object-contain scale-125"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="text-xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">SHELTOK</span>
          </div>



          {/* Messaging */}
          <h1 className="text-2xl font-extrabold tracking-tight mb-3 text-white leading-tight">
            Coming to Mobile Soon
          </h1>
          <p className="text-sm text-white/50 leading-relaxed max-w-[260px] mb-8">
            We are currently crafting a high-performance native-feel mobile interface. Please open SHELTOK on a desktop device for the ultimate experience.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background antialiased overflow-x-hidden min-h-screen">
      {/* PWA Install Banner */}
      <InstallBanner 
        show={showInstallBanner} 
        onInstall={handleInstallClick} 
        onDismiss={dismissInstallBanner} 
      />

      {/* Top-Left Floating Logo (Mobile only, as desktop has sidebar) */}
      <div className="fixed top-4 left-4 z-50 flex items-center gap-2 md:hidden">
        <div className="relative flex items-center justify-center">
          <div className="relative bg-black border border-white/10 p-1 rounded-lg flex items-center justify-center shadow-lg">
            <img 
              src="/logo_custom.png" 
              alt="ShelTok Logo" 
              className="w-5 h-5 object-contain scale-110"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
        <span className="text-xl font-black tracking-tighter text-white select-none flex items-center gap-0.5">
          Shel<span className="text-[#FE2C55] relative" style={{ textShadow: '-1.5px -1.5px 0px #00f0ff, 1.5px 1.5px 0px #FE2C55' }}>Tok</span>
        </span>
      </div>

      {/* Top Header / Login & Profile overlays */}
      <Header 
        connected={connected}
        accountAddress={account?.address?.toString()}
        onDisconnect={disconnect}
        onConnectClick={() => setIsWalletModalOpen(true)}
        walletRef={walletRef}
        isDropdownOpen={isWalletDropdownOpen}
        setDropdownOpen={setIsWalletDropdownOpen}
      />

      <main className="flex h-screen w-full bg-black text-white overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar 
          isVideoFeedOpen={isVideoFeedOpen}
          feedFilter={feedFilter}
          isMediaGalleryOpen={isMediaGalleryOpen}
          isUploadPageOpen={isUploadPageOpen}
          onNavigate={handleSidebarNavigate}
        />

        {/* Global Wrapper for 1, 2 or 3 columns depending on view */}
        <div className="flex-1 h-full flex flex-col overflow-hidden">
          <div className="flex w-full h-full overflow-hidden">
            {/* Main Content (Center) - Centered between sidebars */}
            <div className="flex-1 flex justify-center pl-20 overflow-y-auto scroll-smooth no-scrollbar bg-black h-full">
              <div className="w-full max-w-[500px] h-full flex flex-col justify-center">
                {isUploadPageOpen ? (
                  <div className="w-full h-full">
                    <UploadPage 
                      account={account}
                      connected={connected}
                      isEncoding={isEncoding}
                      isDragging={isDragging}
                      setIsDragging={setIsDragging}
                      selectedFile={selectedFile}
                      setSelectedFile={setSelectedFile}
                      videoPreviewUrl={videoPreviewUrl}
                      videoDescription={videoDescription}
                      setVideoDescription={setVideoDescription}
                      explorerLink={explorerLink}
                      setExplorerLink={setExplorerLink}
                      handleStartUpload={handleStartUpload}
                      fileInputRef={fileInputRef}
                      onConnectWallet={() => setIsWalletModalOpen(true)}
                    />
                  </div>
                ) : isMediaGalleryOpen ? (
                  <div className="w-full h-full">
                    <MediaGallery 
                      blobs={blobs} 
                      walletAddress={account?.address.toString() || ''} 
                      onClose={() => {
                        setIsMediaGalleryOpen(false);
                        setIsVideoFeedOpen(true);
                      }} 
                      isConnected={connected}
                      onConnect={() => {
                        setIsMediaGalleryOpen(false);
                        setIsWalletModalOpen(true);
                      }}
                      onDelete={handleDeleteBlob}
                      isEmbedded={true}
                    />
                  </div>
                ) : (
                  <div className="h-full w-full">
                    <VideoFeed 
                      onClose={() => { setIsVideoFeedOpen(false); setIsMediaGalleryOpen(false); setIsUploadPageOpen(true); }} 
                      isEmbedded={true} 
                      videos={filteredFeedVideos}
                      isLoadingVideos={blobsLoading}
                      activeVideoIndex={activeVideoIndex}
                      onActiveVideoIndexChange={setActiveVideoIndex}
                      connectedAddress={account?.address.toString()}
                      signAndSubmitTransaction={signAndSubmitTransaction}
                      isWalletConnected={connected}
                      isMuted={isFeedMuted}
                      onToggleMute={() => setIsFeedMuted(!isFeedMuted)}
                      onRefresh={handleRefreshFeed}
                      isRefreshing={blobsFetching}
                      feedFilter={feedFilter}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right Section (Third Column) */}
            <aside className="hidden lg:flex w-80 flex-col justify-center items-end pr-10 h-full">
              {/* Scroll Navigation Buttons */}
              {isVideoFeedOpen && !isMediaGalleryOpen && !isUploadPageOpen && (
                <div className="flex flex-col gap-4 animate-fade-in">
                  <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('feed-scroll-prev'))}
                    className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 hover:scale-105 active:scale-90 transition-all flex items-center justify-center text-white cursor-pointer shadow-lg outline-none focus:outline-none"
                    title="Previous Video"
                  >
                    <ChevronUp className="w-6 h-6 text-white/90" />
                  </button>
                  <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('feed-scroll-next'))}
                    className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 hover:scale-105 active:scale-90 transition-all flex items-center justify-center text-white cursor-pointer shadow-lg outline-none focus:outline-none"
                    title="Next Video"
                  >
                    <ChevronDown className="w-6 h-6 text-white/90" />
                  </button>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>

      {/* Mobile Navigation */}
      <nav className={`md:hidden fixed bottom-0 w-full ${isVideoFeedOpen || isUploadPageOpen ? 'bg-black shadow-none' : 'bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0px_-10px_30px_rgba(0,0,0,0.05)]'} flex justify-around items-center h-[64px] px-6 z-[120]`}>
        <button 
          onClick={() => { setIsVideoFeedOpen(true); setIsMediaGalleryOpen(false); setIsUploadPageOpen(false); }}
          className={`flex flex-col items-center gap-1 ${isVideoFeedOpen && !isMediaGalleryOpen && !isUploadPageOpen ? 'text-[#E11D48]' : 'text-on-surface-variant/60'}`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase">Home</span>
        </button>
        <button 
          onClick={() => { setIsUploadPageOpen(true); setIsVideoFeedOpen(false); setIsMediaGalleryOpen(false); }}
          className="relative flex flex-col items-center justify-center shrink-0"
        >
          <div className="relative h-8 w-[40px] active:scale-90 transition-transform duration-200">
            <div className="absolute inset-y-0 -left-[2px] right-[2px] bg-[#E11D48]/80 rounded-md opacity-100"></div>
            <div className="absolute inset-y-0 -right-[2px] left-[2px] bg-[#E11D48] rounded-md opacity-100"></div>
            <div className={`relative h-full w-full ${isVideoFeedOpen || isUploadPageOpen ? 'bg-white' : 'bg-on-surface'} rounded-md flex items-center justify-center`}>
              <Add className={`w-5 h-5 ${isVideoFeedOpen || isUploadPageOpen ? 'text-black font-extrabold' : 'text-surface'} stroke-[4]`} />
            </div>
          </div>
        </button>
        <button 
          onClick={() => { setIsMediaGalleryOpen(true); setIsVideoFeedOpen(false); setIsUploadPageOpen(false); }}
          className={`flex flex-col items-center gap-1 ${isMediaGalleryOpen && !isUploadPageOpen ? 'text-[#E11D48]' : (isVideoFeedOpen || isUploadPageOpen ? 'text-white/60' : 'text-on-surface-variant/60')}`}
        >
          <VideoLibrary className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase">Posts</span>
        </button>
      </nav>

      {/* Wallet Connection Modal */}
      <WalletModal 
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        wallets={wallets}
        connect={connect}
      />

      {/* Delete Confirmation & Success Modals */}
      <DeleteModal 
        isOpen={isDeleteModalOpen}
        blobToDelete={blobToDelete}
        isDeleting={isDeleting}
        onConfirm={confirmDeleteBlob}
        onCancel={() => { setIsDeleteModalOpen(false); setBlobToDelete(null); }}
        isSuccessOpen={isDeleteSuccessModalOpen}
        onSuccessClose={() => setIsDeleteSuccessModalOpen(false)}
      />

      {/* Notification Toast */}
      <NotificationToast 
        show={notification.show}
        message={notification.message}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AptosWalletAdapterProvider 
        autoConnect={true}
        dappConfig={{ network: Network.TESTNET }}
      >
        <Routes>
          <Route path="/" element={<ShelbyApp />} />
        </Routes>
      </AptosWalletAdapterProvider>
    </BrowserRouter>
  );
}
