import React from 'react';
import { motion } from 'motion/react';
import { 
  CloudUpload, 
  FileText as Description, 
  Loader2,
  Lock
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

const getFileExtension = (fileName: string): string => {
  const lowercaseName = (fileName || '').toLowerCase();
  const prefixMatch = lowercaseName.match(/\.([a-z0-9]+):::/);
  if (prefixMatch) return prefixMatch[1];
  const suffixMatch = lowercaseName.match(/\.([a-z0-9]+)$/);
  if (suffixMatch) return suffixMatch[1];
  return 'mp4';
};

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
    <div className="w-full text-white pt-12 md:pt-16 pb-12 animate-fade-in">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight">Upload New Content</h1>
        <p className="text-sm text-white/50">Register and store your audio, video, or data file on the Aptos blockchain with ShelTok.</p>
      </div>

      {!connected ? (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl bg-[#000000] border border-white/10 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-6 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#E11D48] to-transparent opacity-30" />
          <div className="w-16 h-16 bg-[#000000] border border-white/10 rounded-full flex items-center justify-center shadow-lg">
            <Lock className="w-8 h-8 text-[#E11D48] animate-pulse" />
          </div>
          <div className="flex flex-col gap-2 max-w-md">
            <h2 className="text-xl font-bold tracking-tight">Wallet Connection Required</h2>
            <p className="text-sm text-white/40 leading-relaxed">
              ShelTok registered items are verified transactions on the Aptos Testnet. Connect your wallet to access secure distributed streaming and decentralized upload features.
            </p>
          </div>
         </motion.div>
      ) : (
        <div className="flex flex-col gap-6 w-full max-w-[692px] mx-auto">
          
          {/* Section: Dropzone & File Status */}
          <div 
            onClick={() => !isEncoding && fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isEncoding) setIsDragging(true);
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
            className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all group min-h-[280px] relative ${
              isEncoding ? 'cursor-wait opacity-70 border-[#E11D48]/30 bg-[#000000]' : 
              isDragging ? 'border-[#E11D48] bg-[#E11D48]/5 scale-[1.01] shadow-xl shadow-[#E11D48]/5' : 
              'cursor-pointer hover:bg-neutral-900/40 border-white/15 bg-[#000000]'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  setSelectedFile(files[0]);
                }
              }} 
            />
            
            {selectedFile ? (
              <div className="flex flex-col items-center gap-6 w-full" onClick={(e) => e.stopPropagation()}>
                {videoPreviewUrl ? (
                  <div className="w-full max-w-md aspect-video rounded-2xl overflow-hidden bg-black/60 shadow-xl relative group border border-white/10">
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
                  <div className="w-20 h-20 bg-[#000000] border border-white/10 rounded-2xl flex items-center justify-center shadow-lg">
                    <Description className="w-10 h-10 text-[#E11D48]" />
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-[#000000] border border-white/10 rounded-2xl flex items-center justify-center shadow-lg mb-6 group-hover:scale-110 group-hover:border-[#E11D48]/30 transition-all duration-300">
                  <CloudUpload className="w-8 h-8 text-white" />
                </div>
                <p className="text-lg font-bold tracking-tight text-white mb-2">
                  Click to browse or drag and drop files
                </p>
                <p className="text-xs text-white/40 max-w-sm leading-normal">
                  Decentralized, uncensorable content deployment via Aptos gas-optimized transactions.
                </p>

              </>
            )}
          </div>
          
          {/* Metadata & Actions Box */}
          <div className="flex flex-col gap-6 mt-2">
            <div className="flex flex-col gap-2 w-full">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Caption</label>
              <input 
                type="text"
                value={videoDescription}
                onChange={(e) => setVideoDescription(e.target.value)}
                disabled={isEncoding}
                placeholder="Give your upload a caption or title..."
                className="w-full bg-[#000000] border border-white/10 hover:border-white/20 rounded-2xl px-5 py-4 text-white placeholder-white/35 text-sm font-semibold focus:shadow-[0_0_0_2px_rgba(225,29,72,0.2)] transition-all outline-none"
              />
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleStartUpload}
                disabled={!selectedFile || isEncoding}
                className={`w-full py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98] ${
                  selectedFile && !isEncoding
                    ? 'bg-[#E11D48] hover:bg-[#f43f5e] text-white shadow-lg shadow-[#E11D48]/15' 
                    : 'bg-[#000000] text-white/20 cursor-not-allowed border border-white/10'
                }`}
              >
                {isEncoding ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    Publishing...
                  </span>
                ) : (
                  'Upload'
                )}
              </button>
              
              {selectedFile && !isEncoding && (
                <button 
                  onClick={() => {
                    setSelectedFile(null);
                    setVideoDescription('');
                    setExplorerLink(null);
                  }}
                  className="w-full py-2.5 bg-[#000000] hover:bg-neutral-900 border border-white/10 rounded-xl text-xs font-semibold text-white/40 hover:text-white transition-all text-center"
                >
                  Cancel Upload
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadPage;
