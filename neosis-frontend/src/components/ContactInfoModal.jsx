import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Ban, BellOff, Clock3, Download, Flag, Mail, Search, ShieldCheck, Trash2, X } from 'lucide-react';

const selectClass = 'neosis-accent-focus w-full rounded-lg border border-gray-300 dark:border-[#323d38] bg-white dark:bg-[#111313] px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none';

export default function ContactInfoModal({
  open, contact, messageCount = 0, mediaCount = 0, onClose, onMute, onDisappearing,
  onSearch, onExport, onClear, onBlock, onReport
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState('SPAM');
  const [reportDetails, setReportDetails] = useState('');

  useEffect(() => {
    if (!open) return;
    setReportOpen(false);
    setReportCategory('SPAM');
    setReportDetails('');
  }, [open, contact?.email]);

  if (!contact) return null;

  const submitReport = async () => {
    await onReport?.({ category: reportCategory, details: reportDetails.trim() });
    setReportOpen(false);
    setReportDetails('');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[320] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="chat-info-title">
          <motion.div initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 12 }} className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-2xl custom-scrollbar dark:border-[#323d38] dark:bg-[#1a1f1d]">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 dark:border-[#232a28] dark:bg-[#1a1f1d]"><h2 id="chat-info-title" className="font-display text-lg font-bold text-gray-900 dark:text-white">Chat info</h2><button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-[#232a28] dark:hover:text-white" aria-label="Close chat info"><X size={19} /></button></header>

            <div className="p-5">
              <div className="text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#0fa384] to-emerald-600 text-3xl font-bold text-white">{(contact.name || contact.email || '?').charAt(0).toUpperCase()}</div>
                <h3 className="mt-4 font-display text-xl font-bold text-gray-900 dark:text-white">{contact.name}</h3>
                {contact.statusMessage && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{contact.statusMessage}</p>}
                <p className="mt-2 text-xs text-gray-400">{contact.online ? 'Online now' : (contact.lastSeenAt ? `Last seen ${new Date(contact.lastSeenAt).toLocaleString()}` : 'Presence hidden')}</p>
              </div>

              <div className="mt-6 grid gap-2">
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-[#323d38]"><Mail size={17} className="shrink-0 text-[#0fa384]" /><span className="min-w-0 break-all text-sm text-gray-700 dark:text-gray-200">{contact.email}</span></div>
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-[#323d38]"><ShieldCheck size={17} className="shrink-0 text-[#0fa384]" /><span className="text-sm text-gray-700 dark:text-gray-200">Accepted Neosis contact</span></div>
              </div>

              <section className="mt-6 border-t border-gray-200 pt-5 dark:border-[#232a28]">
                <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Conversation</h4>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={onSearch} className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-[#323d38] dark:text-gray-200 dark:hover:bg-[#232a28]"><Search size={16} /> Search chat</button>
                  <button type="button" onClick={onExport} className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-[#323d38] dark:text-gray-200 dark:hover:bg-[#232a28]"><Download size={16} /> Export chat</button>
                  <div className="rounded-lg border border-gray-200 p-3 dark:border-[#323d38]"><span className="block text-xs text-gray-500">Messages loaded</span><span className="text-lg font-bold text-gray-900 dark:text-white">{messageCount}</span></div>
                  <div className="rounded-lg border border-gray-200 p-3 dark:border-[#323d38]"><span className="block text-xs text-gray-500">Media and files</span><span className="text-lg font-bold text-gray-900 dark:text-white">{mediaCount}</span></div>
                </div>
              </section>

              <section className="mt-6 border-t border-gray-200 pt-5 dark:border-[#232a28]">
                <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Chat settings</h4>
                <label className="mt-3 grid gap-2"><span className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><BellOff size={16} /> Mute notifications</span><select className={selectClass} value={contact.muted ? (contact.mutedUntil ? 'CUSTOM' : 'FOREVER') : 'OFF'} onChange={(event) => event.target.value !== 'CUSTOM' && onMute?.(event.target.value)}><option value="OFF">Off</option><option value="15_MINUTES">15 minutes</option><option value="1_HOUR">1 hour</option><option value="8_HOURS">8 hours</option><option value="FOREVER">Forever</option>{contact.mutedUntil && <option value="CUSTOM">Muted until {new Date(contact.mutedUntil).toLocaleString()}</option>}</select></label>
                <label className="mt-4 grid gap-2"><span className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><Clock3 size={16} /> Disappearing messages</span><select className={selectClass} value={String(contact.disappearingMessagesSeconds || 0)} onChange={(event) => onDisappearing?.(Number(event.target.value))}><option value="0">Off</option><option value="86400">24 hours</option><option value="604800">7 days</option><option value="7776000">90 days</option></select><span className="text-xs leading-5 text-gray-500 dark:text-gray-400">Applies to new text messages you send. Attachments remain until separately deleted. Recipients may still copy or capture content.</span></label>
              </section>

              <section className="mt-6 border-t border-gray-200 pt-5 dark:border-[#232a28]">
                <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Safety and data</h4>
                <div className="mt-3 grid gap-2">
                  <button type="button" onClick={onClear} className="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-[#232a28]"><Trash2 size={17} /> Clear chat for me</button>
                  <button type="button" onClick={() => setReportOpen((value) => !value)} className="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-amber-600 hover:bg-amber-500/10"><Flag size={17} /> Report user</button>
                  <button type="button" onClick={onBlock} className="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-rose-500 hover:bg-rose-500/10"><Ban size={17} /> Block user</button>
                </div>

                <AnimatePresence>
                  {reportOpen && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="mt-3 grid gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4"><select className={selectClass} value={reportCategory} onChange={(event) => setReportCategory(event.target.value)}><option value="SPAM">Spam</option><option value="HARASSMENT">Harassment</option><option value="IMPERSONATION">Impersonation</option><option value="ILLEGAL_CONTENT">Illegal content</option><option value="OTHER">Other</option></select><textarea className={`${selectClass} min-h-24 resize-y`} maxLength={1000} value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} placeholder="Optional details for moderators" /><button type="button" onClick={submitReport} className="justify-self-start rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white">Submit report</button></div></motion.div>}
                </AnimatePresence>
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
