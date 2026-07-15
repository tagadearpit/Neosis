import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Loader2, LogOut, Moon, Shield, Sun, Trash2, UserCog, X } from 'lucide-react';

function Toggle({ checked, onChange, label, description, disabled = false }) {
  return (
    <label className="flex items-center justify-between gap-5 py-3 cursor-pointer">
      <span>
        <span className="block text-sm font-semibold text-gray-900 dark:text-white">{label}</span>
        <span className="block text-xs leading-5 text-gray-500 dark:text-gray-400 mt-0.5">{description}</span>
      </span>
      <input className="sr-only" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} />
      <span className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${checked ? 'bg-[#0fa384]' : 'bg-gray-300 dark:bg-[#323d38]'} ${disabled ? 'opacity-50' : ''}`} aria-hidden="true">
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </span>
    </label>
  );
}

export default function SettingsModal({
  open,
  initialTab = 'account',
  user,
  isDarkMode,
  onClose,
  onToggleTheme,
  onSaveProfile,
  onSavePreferences,
  onLogout,
  onDeleteAccount
}) {
  const [tab, setTab] = useState(initialTab);
  const [name, setName] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [typingEnabled, setTypingEnabled] = useState(true);
  const [deleteText, setDeleteText] = useState('');
  const [busyAction, setBusyAction] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !user) return;
    setTab(initialTab);
    setName(user.name || '');
    setStatusMessage(user.statusMessage || '');
    setSoundsEnabled(user.notificationSoundsEnabled !== false);
    setTypingEnabled(user.typingIndicatorsEnabled !== false);
    setDeleteText('');
    setError('');
    setBusyAction(null);
  }, [open, user, initialTab]);

  const run = async (action, callback) => {
    setBusyAction(action);
    setError('');
    try {
      await callback();
    } catch (err) {
      setError(err?.message || 'The operation failed.');
    } finally {
      setBusyAction(null);
    }
  };

  const saveProfile = () => run('profile', () => onSaveProfile({ name: name.trim(), statusMessage: statusMessage.trim() }));
  const savePreferences = () => run('preferences', () => onSavePreferences({
    notificationSoundsEnabled: soundsEnabled,
    typingIndicatorsEnabled: typingEnabled
  }));

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[350] bg-black/70 backdrop-blur-md flex items-center justify-center p-3 md:p-6" role="dialog" aria-modal="true" aria-labelledby="settings-title">
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 18 }} className="w-full max-w-3xl max-h-[92vh] rounded-3xl bg-white dark:bg-[#1a1f1d] border border-gray-200 dark:border-[#323d38] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-[#232a28] flex items-center justify-between">
              <div>
                <h2 id="settings-title" className="text-xl font-bold text-gray-900 dark:text-white font-display">Settings</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Manage your profile, preferences, and account lifecycle.</p>
              </div>
              <button type="button" onClick={onClose} disabled={Boolean(busyAction)} className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-[#232a28] disabled:opacity-50" aria-label="Close settings">
                <X size={20} />
              </button>
            </div>

            <div className="grid md:grid-cols-[190px_1fr] min-h-0 flex-1">
              <nav className="p-3 border-b md:border-b-0 md:border-r border-gray-200 dark:border-[#232a28] bg-gray-50 dark:bg-[#151817] flex md:flex-col gap-2 overflow-x-auto">
                <button type="button" onClick={() => setTab('account')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold whitespace-nowrap ${tab === 'account' ? 'bg-[#0fa384]/10 text-[#0fa384]' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#232a28]'}`}><UserCog size={17} /> Account</button>
                <button type="button" onClick={() => setTab('privacy')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold whitespace-nowrap ${tab === 'privacy' ? 'bg-[#0fa384]/10 text-[#0fa384]' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#232a28]'}`}><Shield size={17} /> Preferences</button>
              </nav>

              <div className="p-6 overflow-y-auto custom-scrollbar">
                {error && <div className="mb-5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">{error}</div>}

                {tab === 'account' ? (
                  <div className="space-y-8">
                    <section>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">Profile</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Your email is managed by Google and cannot be changed here.</p>
                      <div className="mt-5 grid gap-4">
                        <label className="grid gap-2">
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Display name</span>
                          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={50} className="w-full rounded-xl border border-gray-300 dark:border-[#323d38] bg-white dark:bg-[#111313] px-4 py-3 text-sm text-gray-900 dark:text-white focus:border-[#0fa384]" />
                        </label>
                        <label className="grid gap-2">
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Status message</span>
                          <input value={statusMessage} onChange={(event) => setStatusMessage(event.target.value)} maxLength={100} placeholder="Available on Neosis" className="w-full rounded-xl border border-gray-300 dark:border-[#323d38] bg-white dark:bg-[#111313] px-4 py-3 text-sm text-gray-900 dark:text-white focus:border-[#0fa384]" />
                        </label>
                        <label className="grid gap-2">
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Email</span>
                          <input value={user?.email || ''} readOnly className="w-full rounded-xl border border-gray-200 dark:border-[#232a28] bg-gray-100 dark:bg-[#151817] px-4 py-3 text-sm text-gray-500 cursor-not-allowed" />
                        </label>
                      </div>
                      <button type="button" onClick={saveProfile} disabled={busyAction === 'profile' || name.trim().length < 2} className="mt-5 px-5 py-2.5 rounded-xl bg-[#0fa384] hover:bg-[#0ba082] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50">
                        {busyAction === 'profile' && <Loader2 size={16} className="animate-spin" />} Save profile
                      </button>
                    </section>

                    <section className="pt-6 border-t border-gray-200 dark:border-[#232a28]">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">Session</h3>
                      <button type="button" onClick={onLogout} className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#323d38] text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#232a28]"><LogOut size={16} /> Log out</button>
                    </section>

                    <section className="pt-6 border-t border-rose-500/20">
                      <h3 className="text-sm font-bold text-rose-500">Delete account</h3>
                      <p className="text-xs leading-5 text-gray-500 dark:text-gray-400 mt-2">This permanently removes your Neosis profile, messages, media, contacts, and conversation settings. Type DELETE to continue.</p>
                      <input value={deleteText} onChange={(event) => setDeleteText(event.target.value)} placeholder="DELETE" className="mt-4 w-full rounded-xl border border-rose-500/30 bg-white dark:bg-[#111313] px-4 py-3 text-sm text-gray-900 dark:text-white focus:border-rose-500" />
                      <button type="button" onClick={() => run('delete', onDeleteAccount)} disabled={deleteText !== 'DELETE' || busyAction === 'delete'} className="mt-3 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-40">
                        {busyAction === 'delete' ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Delete account permanently
                      </button>
                    </section>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <section>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">Appearance</h3>
                      <button type="button" onClick={onToggleTheme} className="mt-4 w-full flex items-center justify-between rounded-xl border border-gray-200 dark:border-[#323d38] px-4 py-4 text-left hover:bg-gray-50 dark:hover:bg-[#232a28]">
                        <span><span className="block text-sm font-semibold text-gray-900 dark:text-white">Theme</span><span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">Switch between light and dark appearance.</span></span>
                        <span className="flex items-center gap-2 text-xs font-bold text-[#0fa384]">{isDarkMode ? <Moon size={17} /> : <Sun size={17} />}{isDarkMode ? 'Dark' : 'Light'}</span>
                      </button>
                    </section>

                    <section className="pt-6 border-t border-gray-200 dark:border-[#232a28]">
                      <div className="flex items-center gap-2"><Bell size={17} className="text-[#0fa384]" /><h3 className="text-sm font-bold text-gray-900 dark:text-white">Chat preferences</h3></div>
                      <div className="mt-3 divide-y divide-gray-200 dark:divide-[#232a28]">
                        <Toggle checked={soundsEnabled} onChange={setSoundsEnabled} label="Notification sounds" description="Play a brief sound for new messages from unmuted contacts." />
                        <Toggle checked={typingEnabled} onChange={setTypingEnabled} label="Share typing indicators" description="Allow accepted contacts to see when you are typing." />
                      </div>
                      <button type="button" onClick={savePreferences} disabled={busyAction === 'preferences'} className="mt-5 px-5 py-2.5 rounded-xl bg-[#0fa384] hover:bg-[#0ba082] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50">
                        {busyAction === 'preferences' && <Loader2 size={16} className="animate-spin" />} Save preferences
                      </button>
                    </section>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
