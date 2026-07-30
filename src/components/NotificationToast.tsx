import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle } from 'lucide-react';

interface NotificationToastProps {
  show: boolean;
  message: string;
}

export default function NotificationToast({ show, message }: NotificationToastProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-24 md:bottom-12 left-1/2 -translate-x-1/2 z-[120] bg-[#E11D48] text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 backdrop-blur-md"
        >
          <CheckCircle className="w-5 h-5" />
          <span className="font-bold text-sm tracking-tight">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
