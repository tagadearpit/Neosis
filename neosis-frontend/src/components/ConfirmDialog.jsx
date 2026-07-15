import React from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  onConfirm,
  onClose
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[400] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-[#323d38] bg-white dark:bg-[#1a1f1d] shadow-2xl overflow-hidden"
          >
            <div className="p-6 flex gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-rose-500/10 text-rose-500' : 'bg-[#0fa384]/10 text-[#0fa384]'}`}>
                <AlertTriangle size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <h2 id="confirm-dialog-title" className="text-lg font-bold text-gray-900 dark:text-white font-display">{title}</h2>
                  <button type="button" onClick={onClose} disabled={busy} className="text-gray-400 hover:text-gray-700 dark:hover:text-white disabled:opacity-50" aria-label="Close confirmation">
                    <X size={18} />
                  </button>
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{description}</p>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-[#151817] border-t border-gray-200 dark:border-[#232a28] flex justify-end gap-3">
              <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#232a28] disabled:opacity-50">
                {cancelLabel}
              </button>
              <button type="button" onClick={onConfirm} disabled={busy} className={`px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-60 ${danger ? 'bg-rose-500 hover:bg-rose-600' : 'bg-[#0fa384] hover:bg-[#0ba082]'}`}>
                {busy && <Loader2 size={16} className="animate-spin" />}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
