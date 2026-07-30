import { motion, AnimatePresence } from 'motion/react';
import { User as Person, ChevronDown, LogOut } from 'lucide-react';
import { RefObject } from 'react';

interface HeaderProps {
  connected: boolean;
  accountAddress: string | undefined;
  onDisconnect: () => void;
  onConnectClick: () => void;
  walletRef: RefObject<HTMLDivElement | null>;
  isDropdownOpen: boolean;
  setDropdownOpen: (open: boolean) => void;
}

export default function Header({
  connected,
  accountAddress,
  onDisconnect,
  onConnectClick,
  walletRef,
  isDropdownOpen,
  setDropdownOpen
}: HeaderProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-3" ref={walletRef}>
      {connected && accountAddress ? (
        <div className="relative">
          <button 
            onClick={() => setDropdownOpen(!isDropdownOpen)}
            className="bg-black hover:bg-neutral-900 border border-white/15 text-white px-4 py-2 rounded-xl font-bold transition text-sm flex items-center gap-2 shadow-2xl backdrop-blur-md active:scale-95"
          >
            <div className="w-5 h-5 rounded-full bg-[#FE2C55]/20 flex items-center justify-center">
              <Person className="w-3.5 h-3.5 text-[#FE2C55]" />
            </div>
            <span className="font-mono tracking-tight">
              {accountAddress.slice(0, 6)}...{accountAddress.slice(-4)}
            </span>
            <ChevronDown className="w-4 h-4 text-white/50" />
          </button>
          
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 top-12 mt-2 w-52 bg-[#000000] border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-50"
              >
                <div className="px-4 py-3 border-b border-white/5">
                  <p className="text-[10px] uppercase font-black tracking-widest text-white/40 mb-1">Aptos Wallet</p>
                  <p className="text-xs font-mono truncate text-white/95">
                    {accountAddress}
                  </p>
                </div>
                <button 
                  onClick={() => { onDisconnect(); setDropdownOpen(false); }} 
                  className="w-full px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-500/5 text-left flex items-center gap-2 transition-colors outline-none"
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <button 
          onClick={onConnectClick} 
          className="bg-[#FE2C55] hover:brightness-95 text-white px-6 py-2 rounded-lg font-bold transition text-sm z-50 shadow-lg active:scale-95"
        >
          Log in
        </button>
      )}
    </div>
  );
}
