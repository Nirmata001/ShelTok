import { motion, AnimatePresence } from 'motion/react';
import { X as Close, User as Person, ExternalLink, ChevronRight } from 'lucide-react';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: readonly any[];
  connect: (name: any) => void;
}

const POPULAR_WALLETS = [
  { name: 'Petra', url: 'https://petra.app' },
  { name: 'Pontem', url: 'https://pontem.network' },
  { name: 'Martian', url: 'https://martianwallet.xyz' },
  { name: 'Rise', url: 'https://risewallet.io' },
  { name: 'Nightly', url: 'https://nightly.app' },
  { name: 'OKX Wallet', url: 'https://okx.com/web3' }
];

export default function WalletModal({ isOpen, onClose, wallets, connect }: WalletModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-16 right-4 z-[80] w-full max-w-xs"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-full max-w-xs bg-surface-container-lowest rounded-3xl shadow-[0px_40px_80px_rgba(254,44,85,0.15)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 flex justify-between items-center bg-surface-container-lowest shadow-sm">
              <div>
                <h2 className="text-lg font-black tracking-tighter">Connect Wallet</h2>
                <p className="text-[9px] text-on-surface-variant uppercase font-bold tracking-wider">Select your Aptos wallet</p>
              </div>
              <button
                className="p-1.5 hover:bg-surface-container-low rounded-full transition-colors text-on-surface-variant"
                onClick={onClose}
              >
                <Close className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-2.5">
              {POPULAR_WALLETS.map((wallet) => {
                const detectedWallet = wallets?.find(w => w.name.toLowerCase().includes(wallet.name.toLowerCase()));
                const isInstalled = !!detectedWallet;

                return (
                  <div 
                    key={wallet.name}
                    className={`flex items-center justify-between p-3.5 rounded-2xl transition-all shadow-sm ${
                      isInstalled 
                        ? 'bg-surface-container-low hover:bg-[#E11D48]/5 cursor-pointer group' 
                        : 'opacity-60 bg-surface-container-low'
                    }`}
                    onClick={() => {
                      if (isInstalled) {
                        connect(detectedWallet.name);
                        onClose();
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-surface-container-low flex items-center justify-center overflow-hidden">
                        {isInstalled && detectedWallet.icon ? (
                          <img src={detectedWallet.icon} alt={wallet.name} className="w-5 h-5" />
                        ) : (
                          <Person className="w-5 h-5 text-on-surface-variant/40" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">{wallet.name}</p>
                        <p className="text-[9px] uppercase font-black tracking-widest text-on-surface-variant/60">
                          {isInstalled ? 'Detected' : 'Not Installed'}
                        </p>
                      </div>
                    </div>
                    
                    {!isInstalled && (
                      <a 
                        href={wallet.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high text-on-surface rounded-full text-[10px] font-bold hover:bg-surface-container-highest transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Install
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                    
                    {isInstalled && (
                      <div className="w-7 h-7 rounded-full bg-[#E11D48]/10 flex items-center justify-center group-hover:bg-[#E11D48] transition-colors">
                        <ChevronRight className="w-4 h-4 text-[#E11D48] group-hover:text-white transition-colors" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
