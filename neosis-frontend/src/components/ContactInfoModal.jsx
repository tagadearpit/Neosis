import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BellOff, Mail, Pin, ShieldCheck, X } from 'lucide-react';

export default function ContactInfoModal({ open, contact, onClose }) {
  if (!contact) return null;
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[320] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }} className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1a1f1d] border border-gray-200 dark:border-[#323d38] shadow-2xl overflow-hidden">
            <div className="p-6 flex justify-end"><button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white" aria-label="Close contact information"><X size={19} /></button></div>
            <div className="px-7 pb-8 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#0fa384] to-emerald-600 flex items-center justify-center text-3xl font-bold text-white">{(contact.name || contact.email || '?').charAt(0).toUpperCase()}</div>
              <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white font-display">{contact.name}</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{contact.statusMessage || 'Available on Neosis'}</p>
              <div className="mt-6 grid gap-3 text-left">
                <div className="rounded-xl border border-gray-200 dark:border-[#323d38] p-4 flex items-center gap-3"><Mail size={18} className="text-[#0fa384]" /><span className="text-sm text-gray-700 dark:text-gray-200 break-all">{contact.email}</span></div>
                <div className="rounded-xl border border-gray-200 dark:border-[#323d38] p-4 flex items-center gap-3"><ShieldCheck size={18} className="text-[#0fa384]" /><span className="text-sm text-gray-700 dark:text-gray-200">Accepted Neosis contact</span></div>
                {(contact.pinned || contact.muted) && <div className="flex flex-wrap gap-2">{contact.pinned && <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0fa384]/10 text-[#0fa384] px-3 py-1.5 text-xs font-semibold"><Pin size={13} /> Pinned</span>}{contact.muted && <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-[#232a28] text-gray-600 dark:text-gray-300 px-3 py-1.5 text-xs font-semibold"><BellOff size={13} /> Muted</span>}</div>}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
