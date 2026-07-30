import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteModalProps {
  isOpen: boolean;
  blobToDelete: any;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isSuccessOpen: boolean;
  onSuccessClose: () => void;
}

export default function DeleteModal({
  isOpen,
  blobToDelete,
  isDeleting,
  onConfirm,
  onCancel,
  isSuccessOpen,
  onSuccessClose
}: DeleteModalProps) {
  return (
    <>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isOpen && blobToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-on-background/20 backdrop-blur-md"
            onClick={() => {
              if (!isDeleting) {
                onCancel();
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm bg-surface-container-lowest rounded-3xl shadow-[0px_40px_80px_rgba(254,44,85,0.15)] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mb-6">
                  <AlertTriangle className="w-8 h-8 text-error" />
                </div>
                
                <h2 className="text-2xl font-black tracking-tighter text-on-surface mb-2">Delete File?</h2>
                <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
                  Are you sure you want to delete <span className="font-bold text-on-surface">"{blobToDelete.blobNameSuffix || blobToDelete.blob_name || 'this file'}"</span>? 
                  This action cannot be undone.
                </p>

                <div className="flex flex-col w-full gap-3">
                  <button
                    disabled={isDeleting}
                    onClick={onConfirm}
                    className="w-full py-4 bg-error text-white rounded-2xl font-bold shadow-lg shadow-error/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-5 h-5" />
                        Delete File
                      </>
                    )}
                  </button>
                  <button
                    disabled={isDeleting}
                    onClick={onCancel}
                    className="w-full py-4 bg-surface-container-high text-on-surface rounded-2xl font-bold active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Success Modal */}
      <AnimatePresence>
        {isSuccessOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-center justify-center p-6 bg-on-background/20 backdrop-blur-md"
            onClick={onSuccessClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm bg-surface-container-lowest rounded-3xl shadow-[0px_40px_80px_rgba(254,44,85,0.15)] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                  <Trash2 className="w-8 h-8 text-primary" />
                </div>
                
                <h2 className="text-2xl font-black tracking-tighter text-on-surface mb-2">File Deleted</h2>
                <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
                  Your file has been successfully removed from the Shelby network.
                </p>

                <button
                  onClick={onSuccessClose}
                  className="w-full py-4 bg-primary text-on-primary rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
