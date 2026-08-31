import React from 'react';
import { 
  CloudUpload, 
  FileText as Description, 
  Loader2,
  Video,
  X
} from 'lucide-react';

interface UploadPageProps {
  account: any;
  connected: boolean;
  isEncoding: boolean;
  isDragging: boolean;
  setIsDragging: (val: boolean) => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  videoPreviewUrl: string | null;
  videoDescription: string;
  setVideoDescription: (desc: string) => void;
  explorerLink: string | null;
  setExplorerLink: (link: string | null) => void;
  handleStartUpload: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onConnectWallet: () => void;
}

const UploadPage: React.FC<UploadPageProps> = ({
  account,
  connected,
  isEncoding,
  isDragging,
  setIsDragging,
  selectedFile,
  setSelectedFile,
  videoPreviewUrl,
  videoDescription,
  setVideoDescription,
  explorerLink,
  setExplorerLink,
  handleStartUpload,
  fileInputRef,
  onConnectWallet,
}) => {
  return (
    <div className="w-full text-white px-4 md:px-0 pt-4 md:pt-16 pb-24 md:pb-12 animate-fade-in max-w-xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-1 mb-5 md:mb-8 text-left">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <span>Create Post</span>
        </h1>
        <p className="text-xs md:text-sm text-white/50">
          Upload and store your content
        </p>
      </div>

      <div className="flex flex-col gap-4 md:gap-6 w-full">
        {/* Section: File Selection / Dropzone */}
        <div 
          onClick={() => !isEncoding && !selectedFile && fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isEncoding && !selectedFile) setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            if (isEncoding) return;
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
              setSelectedFile(files[0]);
            }
          }}
          className={`border border-dashed rounded-2xl md:rounded-3xl p-4 md:p-8 flex flex-col items-center justify-center text-center transition-all relative overflow-hidden ${
            isEncoding ? 'cursor-wait opacity-75 border-[#FE2C55]/40 bg-neutral-950' : 
            isDragging ? 'border-[#00f2ea] bg-[#00f2ea]/5 scale-[1.01]' : 
            selectedFile ? 'border-white/20 bg-neutral-950' :
            'cursor-pointer hover:bg-neutral-900/60 border-white/20 bg-neutral-950/60 active:scale-[0.99]'
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="video/*"
            className="hidden" 
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) {
                setSelectedFile(files[0]);
              }
            }} 
          />
          
          {selectedFile ? (
            <div className="flex flex-col items-center gap-4 w-full">
              {videoPreviewUrl ? (
                <div className="w-full max-w-sm aspect-video md:aspect-[9/16] md:max-h-[300px] rounded-xl overflow-hidden bg-black shadow-xl relative border border-white/10 flex items-center justify-center">
                  <video
                    src={videoPreviewUrl}
                    controls
                    playsInline
                    autoPlay
                    muted
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center shadow-lg">
                  <Description className="w-8 h-8 text-[#FE2C55]" />
                </div>
              )}

              <div className="flex items-center justify-between w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5">
                <div className="flex items-center gap-2 overflow-hidden text-left">
                  <Video className="w-4 h-4 text-[#00f2ea] shrink-0" />
                  <span className="text-xs font-medium truncate max-w-[200px] md:max-w-[300px] text-white/90">
                    {selectedFile.name}
                  </span>
                  <span className="text-[10px] font-mono text-white/40 shrink-0">
                    ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
                  </span>
                </div>
                {!isEncoding && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setVideoDescription('');
                      setExplorerLink(null);
                    }}
                    className="p-1 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-6 md:py-8 flex flex-col items-center gap-3">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-tr from-white/10 to-white/5 border border-white/15 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <CloudUpload className="w-6 h-6 md:w-7 md:h-7 text-[#00f2ea]" />
              </div>
              <div>
                <p className="text-sm md:text-base font-bold text-white mb-0.5">
                  Tap to select video
                </p>
                <p className="text-[11px] text-white/40">
                  MP4, WebM, or MOV format supported
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Metadata & Actions */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[11px] font-bold uppercase tracking-wider text-white/50">
              Caption
            </label>
            <textarea 
              rows={2}
              value={videoDescription}
              onChange={(e) => setVideoDescription(e.target.value)}
              disabled={isEncoding}
              placeholder="Write a caption, tags, or description..."
              className="w-full bg-neutral-950 border border-white/15 hover:border-white/25 focus:border-[#FE2C55] rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm font-medium transition-all outline-none resize-none"
            />
          </div>

          <div className="flex flex-col gap-2.5 pt-1">
            <button 
              onClick={() => {
                if (!connected) {
                  onConnectWallet();
                } else {
                  handleStartUpload();
                }
              }}
              disabled={(!selectedFile && connected) || isEncoding}
              className={`w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all active:scale-[0.98] ${
                !connected 
                  ? 'bg-gradient-to-r from-[#FE2C55] to-[#FF0050] hover:brightness-110 text-white shadow-lg shadow-[#FE2C55]/20'
                  : selectedFile && !isEncoding
                    ? 'bg-gradient-to-r from-[#FE2C55] to-[#FF0050] hover:brightness-110 text-white shadow-lg shadow-[#FE2C55]/20' 
                    : 'bg-neutral-900 text-white/30 cursor-not-allowed border border-white/10'
              }`}
            >
              {!connected ? (
                'Connect Wallet to Publish'
              ) : isEncoding ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  publishing.....
                </span>
              ) : (
                'Publish Video'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;

