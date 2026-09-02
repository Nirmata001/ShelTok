import { motion, AnimatePresence } from 'motion/react';
import { Check, Info } from 'lucide-react';

interface NotificationToastProps {
  show: boolean;
  message: string;
}

export default function NotificationToast({ show, message }: NotificationToastProps) {
  const isInfo = 
    message.toLowerCase().includes('recommend') || 
    message.toLowerCase().includes('soon') || 
    message.toLowerCase().includes('please');

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -14, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.94 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-4 md:top-5 left-1/2 -translate-x-1/2 z-[150] pointer-events-none select-none max-w-[90vw]"
        >
          <div className="bg-neutral-900/95 border border-white/15 text-white shadow-xl shadow-black/50 backdrop-blur-xl px-3 py-1.5 md:px-3.5 md:py-1.5 rounded-full flex items-center gap-2">
            <div 
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                isInfo ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {isInfo ? (
                <Info className="w-2.5 h-2.5" />
              ) : (
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              )}
            </div>
            <span className="text-[11px] md:text-xs font-medium text-white/95 tracking-normal truncate max-w-[240px] md:max-w-[360px]">
              {message}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

