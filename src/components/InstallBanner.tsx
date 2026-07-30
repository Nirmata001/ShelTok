import { motion, AnimatePresence } from 'motion/react';
import { X as Close } from 'lucide-react';

interface InstallBannerProps {
  show: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

export default function InstallBanner({ show, onInstall, onDismiss }: InstallBannerProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 md:bottom-8 left-4 right-4 md:left-auto md:right-8 md:w-96 z-[100] bg-[#E11D48] text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4"
        >
          <div className="flex-1">
            <p className="text-sm font-bold leading-tight">Install ShelTok for the best experience</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onInstall}
              className="bg-white text-[#E11D48] px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/90 transition-colors active:scale-95"
            >
              Install
            </button>
            <button
              onClick={onDismiss}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              aria-label="Dismiss"
            >
              <Close className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
