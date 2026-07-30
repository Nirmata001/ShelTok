import { Home, Video as VideoLibrary, CloudUpload } from 'lucide-react';

interface SidebarProps {
  isVideoFeedOpen: boolean;
  feedFilter: 'explore' | 'following';
  isMediaGalleryOpen: boolean;
  isUploadPageOpen: boolean;
  onNavigate: (view: 'explore' | 'following' | 'posts' | 'live' | 'upload') => void;
}

export default function Sidebar({
  isVideoFeedOpen,
  feedFilter,
  isMediaGalleryOpen,
  isUploadPageOpen,
  onNavigate
}: SidebarProps) {
  const isForYouActive = isVideoFeedOpen && feedFilter === 'explore' && !isMediaGalleryOpen && !isUploadPageOpen;
  const isFollowingActive = isVideoFeedOpen && feedFilter === 'following' && !isUploadPageOpen && !isMediaGalleryOpen;
  const isPostsActive = isMediaGalleryOpen && !isUploadPageOpen;
  const isUploadActive = isUploadPageOpen;

  return (
    <aside className="w-[200px] xl:w-[240px] flex-shrink-0 h-full overflow-y-auto no-scrollbar px-2 py-6 bg-black hidden md:flex flex-col z-40" data-purpose="sidebar" id="main-sidebar">
      {/* Logo Brand Header */}
      <div className="px-5 mb-4 flex items-center gap-2.5">
        <div className="relative flex items-center justify-center">
          <div className="relative bg-black border border-white/10 p-1 rounded-xl flex items-center justify-center shadow-lg">
            <img 
              src="/logo_custom.png" 
              alt="ShelTok Logo" 
              className="w-6 h-6 object-contain scale-140"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-black tracking-tighter text-white select-none flex items-center gap-0.5">
            Shel<span className="text-[#FE2C55] relative" style={{ textShadow: '-1.5px -1.5px 0px #00f0ff, 1.5px 1.5px 0px #FE2C55' }}>Tok</span>
          </span>
          <span className="text-[9px] uppercase font-bold tracking-widest text-white/30 -mt-1">Decentralized</span>
        </div>
      </div>

      <nav className="flex flex-col px-2 gap-1.5 mb-4">
        <button 
          onClick={() => onNavigate('explore')}
          className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all cursor-pointer font-semibold text-left outline-none ${
            isForYouActive
              ? 'text-[#FE2C55] bg-transparent' 
              : 'text-white hover:bg-white/5'
           }`}
        >
          <Home className="w-5.5 h-5.5" />
          <span className="text-base">For You</span>
        </button>

        <button 
          onClick={() => onNavigate('following')}
          className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all cursor-pointer font-semibold text-left outline-none ${
            isFollowingActive
              ? 'text-[#FE2C55] bg-white/5' 
              : 'text-white hover:bg-white/5'
          }`}
        >
          <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 21c-2.316 0-4.445-.69-6.227-1.872v-.109c0-3.32 2.682-6.012 5.992-6.012 1.341 0 2.578.438 3.578 1.182M18.12 10c0 1.725-1.399 3.125-3.12 3.125-1.72 0-3.12-1.4-3.12-3.125 0-1.725 1.4-3.125 3.12-3.125 1.721 0 3.12 1.4 3.12 3.125zM10.01 9a2.76 2.76 0 002.75-2.76A2.76 2.76 0 0010.01 3.5a2.76 2.76 0 00-2.75 2.74A2.76 2.76 0 0010.01 9z" />
          </svg>
          <span className="text-base">Following</span>
        </button>
        
        <button 
          onClick={() => onNavigate('posts')}
          className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all cursor-pointer font-semibold text-left outline-none ${
            isPostsActive
              ? 'text-[#FE2C55] bg-transparent' 
              : 'text-white hover:bg-white/5'
          }`}
        >
          <VideoLibrary className="w-5.5 h-5.5" />
          <span className="text-base">Posts</span>
        </button>

        <button 
          onClick={() => onNavigate('live')}
          className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all cursor-pointer font-semibold text-left text-white hover:bg-white/5 outline-none"
        >
          <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-.11-8.157-.31M12 10.5c2.998 0 5.74-.11 8.157-.31m-16.314 0a12.02 12.02 0 001.15 4.8M20.314 10.19a12.02 12.02 0 01-1.15 4.8" />
          </svg>
          <span className="text-base">LIVE</span>
        </button>

        <button 
          onClick={() => onNavigate('upload')}
          className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all cursor-pointer font-semibold text-left outline-none ${
            isUploadActive
              ? 'text-[#FE2C55] bg-transparent' 
              : 'text-white hover:bg-white/5'
          }`}
        >
          <CloudUpload className="w-5.5 h-5.5" />
          <span className="text-base">Upload</span>
        </button>
      </nav>

      {/* Footer / Copyright Section */}
      <div className="mt-1 px-5 pt-3 border-t border-white/5 flex flex-col gap-2 text-white/30 text-[11.5px] font-medium select-none tracking-tight">
        <div className="flex flex-col gap-1.5">
          <span className="text-white/40 tracking-wider font-semibold uppercase text-[10px]">Early Access</span>
        </div>
        <div className="text-[11px] font-normal text-white/20 mt-1">
          © 2026 ShelTok
        </div>
      </div>
    </aside>
  );
}
