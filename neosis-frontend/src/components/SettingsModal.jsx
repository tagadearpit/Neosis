import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Ban, Bell, CheckCircle2, Database, Download, ExternalLink, HardDrive,
  History, KeyRound, Loader2, LogOut, MessageCircle,
  Palette, Shield, Smartphone, Trash2, UserCog, X
} from 'lucide-react';
import api, { getApiErrorMessage } from '../api';

const DEFAULT_SETTINGS = {
  privacy: {
    lastSeen: 'CONTACTS', onlineStatus: 'CONTACTS', profilePhoto: 'CONTACTS', about: 'CONTACTS',
    readReceipts: true, typingIndicators: true, allowMessagesFrom: 'CONTACTS', allowGroupInvitesFrom: 'CONTACTS'
  },
  notifications: {
    messageNotifications: true, groupNotifications: true, sound: 'CHIME', desktopNotifications: false,
    emailNotifications: false, preview: 'FULL', doNotDisturbStart: null, doNotDisturbEnd: null
  },
  appearance: { theme: 'SYSTEM', accentColor: '#0fa384', fontSize: 'MEDIUM', bubbleDensity: 'COMFORTABLE', compactMode: false },
  media: { autoDownloadImages: true, autoDownloadVideos: false, autoDownloadFiles: false, linkPreviews: true, blockUnknownAttachments: true },
  security: { highPrivacyMode: false, notifyNewLogin: true }
};

const TABS = [
  ['account', 'Account', UserCog],
  ['privacy', 'Privacy', Shield],
  ['security', 'Security', KeyRound],
  ['notifications', 'Notifications', Bell],
  ['chats', 'Chats', MessageCircle],
  ['appearance', 'Appearance', Palette],
  ['media', 'Media & storage', HardDrive],
  ['blocked', 'Blocked users', Ban],
  ['data', 'Data & account', Database]
];

const mergeSettings = (settings) => Object.fromEntries(
  Object.entries(DEFAULT_SETTINGS).map(([section, defaults]) => [section, { ...defaults, ...(settings?.[section] || {}) }])
);

const controlClass = 'neosis-accent-focus w-full rounded-lg border border-gray-300 dark:border-[#323d38] bg-white dark:bg-[#111313] px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none';

function Toggle({ checked, onChange, label, description, disabled = false }) {
  return (
    <label className={`flex items-center justify-between gap-5 py-3 ${disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer'}`}>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-gray-900 dark:text-white">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-5 text-gray-500 dark:text-gray-400">{description}</span>}
      </span>
      <input className="sr-only" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} />
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'neosis-accent-bg' : 'bg-gray-300 dark:bg-[#323d38]'}`} aria-hidden="true">
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </span>
    </label>
  );
}

function SelectSetting({ label, description, value, onChange, options, disabled = false }) {
  return (
    <label className={`grid gap-2 py-3 sm:grid-cols-[1fr_180px] sm:items-center ${disabled ? 'opacity-55' : ''}`}>
      <span>
        <span className="block text-sm font-semibold text-gray-900 dark:text-white">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-5 text-gray-500 dark:text-gray-400">{description}</span>}
      </span>
      <select className={controlClass} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function Section({ title, description, children }) {
  return (
    <section className="border-b border-gray-200 pb-6 last:border-b-0 dark:border-[#232a28]">
      <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
      {description && <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{description}</p>}
      <div className="mt-3 divide-y divide-gray-200 dark:divide-[#232a28]">{children}</div>
    </section>
  );
}

function SaveButton({ busy, onClick, label = 'Save changes' }) {
  return (
    <button type="button" onClick={onClick} disabled={busy} className="neosis-accent-bg mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white transition-all disabled:opacity-50">
      {busy && <Loader2 size={16} className="animate-spin" />} {label}
    </button>
  );
}

const formatDate = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Unknown';

export default function SettingsModal({
  open, initialTab = 'account', user, onClose, onSaveProfile, onSettingsUpdated, onLogout, onDeleteAccount, onChatsCleared
}) {
  const [tab, setTab] = useState(initialTab);
  const [name, setName] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [settings, setSettings] = useState(mergeSettings());
  const [sessions, setSessions] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [securityLoaded, setSecurityLoaded] = useState(false);
  const [blockedLoaded, setBlockedLoaded] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [clearText, setClearText] = useState('');
  const [busyAction, setBusyAction] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!open || !user) return;
    setTab(initialTab);
    setName(user.name || '');
    setStatusMessage(user.statusMessage || '');
    setSettings(mergeSettings(user.settings));
    setDeleteText('');
    setClearText('');
    setError('');
    setNotice('');
    setSecurityLoaded(false);
    setBlockedLoaded(false);
  }, [open, user, initialTab]);

  const run = useCallback(async (action, callback) => {
    setBusyAction(action);
    setError('');
    setNotice('');
    try {
      return await callback();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, requestError?.message || 'The operation failed.'));
      return null;
    } finally {
      setBusyAction(null);
    }
  }, []);

  const updateSection = (section, key, value) => setSettings((current) => ({
    ...current,
    [section]: { ...current[section], [key]: value }
  }));

  const saveSection = (section) => run(`save-${section}`, async () => {
    const response = await api.patch('/api/settings', { [section]: settings[section] });
    const merged = mergeSettings(response.data);
    setSettings(merged);
    onSettingsUpdated?.(response.data);
    setNotice('Settings saved.');
  });

  const loadSecurity = useCallback(() => run('load-security', async () => {
    setSecurityLoaded(true);
    const [sessionResponse, historyResponse] = await Promise.all([
      api.get('/api/security/sessions'),
      api.get('/api/security/login-history')
    ]);
    setSessions(sessionResponse.data || []);
    setLoginHistory(historyResponse.data || []);
  }), [run]);

  const loadBlocked = useCallback(() => run('load-blocked', async () => {
    setBlockedLoaded(true);
    const response = await api.get('/api/safety/blocked');
    setBlockedUsers(response.data || []);
  }), [run]);

  useEffect(() => {
    if (!open) return;
    if (tab === 'security' && !securityLoaded && busyAction !== 'load-security') loadSecurity();
    if (tab === 'blocked' && !blockedLoaded && busyAction !== 'load-blocked') loadBlocked();
  }, [open, tab, securityLoaded, blockedLoaded, busyAction, loadSecurity, loadBlocked]);

  const enableDesktopNotifications = async (enabled) => {
    if (enabled && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('Browser notification permission was not granted.');
        return;
      }
    }
    updateSection('notifications', 'desktopNotifications', enabled);
  };

  const download = async (path, filename) => run(`download-${path}`, async () => {
    const response = await api.get(path, { responseType: 'blob', timeout: 60_000 });
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice('Export created.');
  });

  const appearance = settings.appearance;
  const securityBusy = busyAction === 'load-security';
  const googleSecurityUrl = 'https://myaccount.google.com/security';

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[350] flex items-center justify-center bg-black/70 p-2 backdrop-blur-md md:p-5" role="dialog" aria-modal="true" aria-labelledby="settings-title">
          <motion.div initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 12 }} className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-[#323d38] dark:bg-[#1a1f1d]">
            <header className="flex items-center justify-between border-b border-gray-200 px-4 py-4 dark:border-[#232a28] md:px-6">
              <div><h2 id="settings-title" className="font-display text-xl font-bold text-gray-900 dark:text-white">Settings</h2><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Privacy, security, chats, and account controls.</p></div>
              <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-[#232a28] dark:hover:text-white" aria-label="Close settings"><X size={20} /></button>
            </header>

            <div className="grid min-h-0 flex-1 md:grid-cols-[220px_1fr]">
              <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-gray-50 p-2 dark:border-[#232a28] dark:bg-[#151817] md:flex-col md:border-b-0 md:border-r">
                {TABS.map(([value, label, Icon]) => (
                  <button key={value} type="button" onClick={() => { setTab(value); setError(''); setNotice(''); }} className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold whitespace-nowrap ${tab === value ? 'neosis-accent-soft' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#232a28]'}`}>
                    <Icon size={17} /> {label}
                  </button>
                ))}
              </nav>

              <main className="overflow-y-auto p-4 custom-scrollbar md:p-7">
                {error && <div className="mb-5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">{error}</div>}
                {notice && <div className="neosis-accent-soft mb-5 flex items-center gap-2 rounded-lg border border-current px-4 py-3 text-sm"><CheckCircle2 size={16} />{notice}</div>}

                {tab === 'account' && <div className="space-y-7">
                  <Section title="Profile info" description="Your public identity for accepted Neosis contacts.">
                    <label className="grid gap-2 py-3"><span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Display name</span><input className={controlClass} value={name} maxLength={50} onChange={(event) => setName(event.target.value)} /></label>
                    <label className="grid gap-2 py-3"><span className="text-xs font-semibold text-gray-600 dark:text-gray-300">About</span><input className={controlClass} value={statusMessage} maxLength={100} onChange={(event) => setStatusMessage(event.target.value)} /></label>
                    <label className="grid gap-2 py-3"><span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Verified email</span><div className="flex items-center gap-2"><input className={`${controlClass} cursor-not-allowed bg-gray-100 dark:bg-[#151817]`} value={user?.email || ''} readOnly /><CheckCircle2 size={18} className="shrink-0 text-[#0fa384]" /></div></label>
                    <label className="grid gap-2 py-3"><span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Phone</span><input className={`${controlClass} cursor-not-allowed bg-gray-100 dark:bg-[#151817]`} value="Not collected by Neosis" readOnly /></label>
                  </Section>
                  <SaveButton busy={busyAction === 'profile'} label="Save profile" onClick={() => run('profile', async () => { await onSaveProfile({ name: name.trim(), statusMessage: statusMessage.trim() }); setNotice('Profile updated.'); })} />
                  <Section title="Current session"><button type="button" onClick={onLogout} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-[#323d38] dark:text-gray-200 dark:hover:bg-[#232a28]"><LogOut size={16} /> Log out on this device</button></Section>
                </div>}

                {tab === 'privacy' && <div className="space-y-7">
                  <Section title="Visibility" description="Contacts means people with an accepted Neosis connection.">
                    {[
                      ['lastSeen', 'Last seen'], ['onlineStatus', 'Online status'], ['about', 'About / bio']
                    ].map(([key, label]) => <SelectSetting key={key} label={label} value={settings.privacy[key]} onChange={(value) => updateSection('privacy', key, value)} options={[["EVERYONE", 'Everyone'], ["CONTACTS", 'Contacts'], ["NOBODY", 'Nobody']]} />)}
                    <SelectSetting disabled label="Profile photo" description="Profile photo uploads are not enabled in this release." value="CONTACTS" onChange={() => {}} options={[["CONTACTS", 'Contacts']]} />
                  </Section>
                  <Section title="Messaging privacy">
                    <Toggle checked={settings.privacy.readReceipts} onChange={(value) => updateSection('privacy', 'readReceipts', value)} label="Read receipts" description="When disabled, senders cannot see when you read their messages." />
                    <Toggle checked={settings.privacy.typingIndicators} onChange={(value) => updateSection('privacy', 'typingIndicators', value)} label="Typing indicators" description="Share when you are actively composing a message." />
                    <SelectSetting label="Who can message me" value={settings.privacy.allowMessagesFrom} onChange={(value) => updateSection('privacy', 'allowMessagesFrom', value)} options={[["EVERYONE", 'Everyone'], ["CONTACTS", 'Contacts'], ["NOBODY", 'Nobody']]} />
                    <SelectSetting disabled label="Who can add me to groups" description="Group conversations are not enabled in this release." value={settings.privacy.allowGroupInvitesFrom} onChange={() => {}} options={[["CONTACTS", 'Contacts']]} />
                  </Section>
                  <SaveButton busy={busyAction === 'save-privacy'} onClick={() => saveSection('privacy')} />
                </div>}

                {tab === 'security' && <div className="space-y-7">
                  <Section title="Google account protection" description="Neosis uses Google OAuth and never stores your password, passkey, or Google 2-step verification secret.">
                    {['Password', 'Two-factor authentication', 'Passkeys'].map((label) => <div key={label} className="flex items-center justify-between gap-4 py-3"><span><span className="block text-sm font-semibold text-gray-900 dark:text-white">{label}</span><span className="text-xs text-gray-500 dark:text-gray-400">Managed securely by Google</span></span><a href={googleSecurityUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-[#0fa384]">Manage <ExternalLink size={13} /></a></div>)}
                  </Section>
                  <Section title="High privacy mode" description="Applies a hardened privacy profile with hidden presence, no read or typing receipts, hidden previews, and stricter attachment behavior.">
                    <Toggle checked={settings.security.highPrivacyMode} onChange={(value) => updateSection('security', 'highPrivacyMode', value)} label="Enable high privacy mode" />
                    <Toggle checked={settings.security.notifyNewLogin} onChange={(value) => updateSection('security', 'notifyNewLogin', value)} label="Notify me about new device logins" description="Show an in-app alert for a new device signature. Masked login history is retained for 180 days." />
                    <SaveButton busy={busyAction === 'save-security'} onClick={() => saveSection('security')} />
                  </Section>
                  <Section title="Active sessions" description="Session IDs are never exposed; each device is represented by a short one-way fingerprint.">
                    {securityBusy && <div className="flex items-center gap-2 py-4 text-sm text-gray-500"><Loader2 size={16} className="animate-spin" /> Loading sessions</div>}
                    {sessions.map((session) => <div key={session.id} className="flex items-start justify-between gap-4 py-3"><span className="flex min-w-0 gap-3"><Smartphone size={18} className="mt-0.5 shrink-0 text-[#0fa384]" /><span><span className="block text-sm font-semibold text-gray-900 dark:text-white">{session.device} · {session.browser}</span><span className="block text-xs text-gray-500 dark:text-gray-400">{session.maskedIp} · Active {formatDate(session.lastAccessedAt)}</span><span className="font-mono text-[10px] text-gray-400">{session.id}</span></span></span>{session.current ? <span className="rounded-full bg-[#0fa384]/10 px-2 py-1 text-[10px] font-bold text-[#0fa384]">THIS DEVICE</span> : <button type="button" onClick={() => run(`revoke-${session.id}`, async () => { await api.delete(`/api/security/sessions/${session.id}`); setSessions((items) => items.filter((item) => item.id !== session.id)); setNotice('Session revoked.'); })} className="text-xs font-bold text-rose-500">Revoke</button>}</div>)}
                    {sessions.filter((session) => !session.current).length > 0 && <button type="button" onClick={() => run('revoke-others', async () => { await api.delete('/api/security/sessions'); setSessions((items) => items.filter((item) => item.current)); setNotice('Other sessions revoked.'); })} className="mt-3 rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-bold text-rose-500">Log out all other devices</button>}
                  </Section>
                  <Section title="Login history">
                    {loginHistory.map((event) => <div key={event.id} className="flex gap-3 py-3"><History size={17} className="mt-0.5 shrink-0 text-[#0fa384]" /><span><span className="block text-sm font-semibold text-gray-900 dark:text-white">{event.device} · {event.browser}</span><span className="text-xs text-gray-500 dark:text-gray-400">{event.maskedIp} · {formatDate(event.createdAt)}</span></span></div>)}
                    {!securityBusy && loginHistory.length === 0 && <p className="py-3 text-sm text-gray-500">No login history is available yet.</p>}
                  </Section>
                </div>}

                {tab === 'notifications' && <div className="space-y-7">
                  <Section title="Message notifications">
                    <Toggle checked={settings.notifications.messageNotifications} onChange={(value) => updateSection('notifications', 'messageNotifications', value)} label="Direct message notifications" />
                    <Toggle disabled checked={settings.notifications.groupNotifications} onChange={() => {}} label="Group notifications" description="Available when group chats launch." />
                    <Toggle checked={settings.notifications.desktopNotifications} onChange={enableDesktopNotifications} label="Desktop notifications" description="Requires browser permission on this device." />
                    <Toggle disabled checked={false} onChange={() => {}} label="Email summaries" description="Email delivery is not configured, so this control remains safely disabled." />
                    <SelectSetting label="Notification sound" value={settings.notifications.sound} onChange={(value) => updateSection('notifications', 'sound', value)} options={[["CHIME", 'Chime'], ["SOFT", 'Soft'], ["NONE", 'None']]} />
                    <SelectSetting label="Message preview" value={settings.notifications.preview} onChange={(value) => updateSection('notifications', 'preview', value)} options={[["FULL", 'Sender and message'], ["SENDER", 'Sender only'], ["HIDDEN", 'Hidden']]} />
                  </Section>
                  <Section title="Do not disturb" description="Leave both fields empty to disable quiet hours.">
                    <div className="grid grid-cols-2 gap-3 py-3"><label className="grid gap-1 text-xs font-semibold text-gray-600 dark:text-gray-300">Start<input type="time" className={controlClass} value={settings.notifications.doNotDisturbStart || ''} onChange={(event) => updateSection('notifications', 'doNotDisturbStart', event.target.value || null)} /></label><label className="grid gap-1 text-xs font-semibold text-gray-600 dark:text-gray-300">End<input type="time" className={controlClass} value={settings.notifications.doNotDisturbEnd || ''} onChange={(event) => updateSection('notifications', 'doNotDisturbEnd', event.target.value || null)} /></label></div>
                  </Section>
                  <SaveButton busy={busyAction === 'save-notifications'} onClick={() => saveSection('notifications')} />
                </div>}

                {tab === 'chats' && <div className="space-y-7">
                  <Section title="Conversation controls" description="Pinning, timed mute, search, export, clear chat, blocking, reporting, and disappearing messages are available from Chat info for each contact.">
                    <div className="py-3 text-sm text-gray-600 dark:text-gray-300">Open a conversation, select the contact name, then choose the control you need.</div>
                  </Section>
                  <Section title="Privacy shortcuts"><Toggle checked={settings.privacy.readReceipts} onChange={(value) => updateSection('privacy', 'readReceipts', value)} label="Read receipts" /><Toggle checked={settings.privacy.typingIndicators} onChange={(value) => updateSection('privacy', 'typingIndicators', value)} label="Typing indicators" /></Section>
                  <SaveButton busy={busyAction === 'save-privacy'} onClick={() => saveSection('privacy')} />
                </div>}

                {tab === 'appearance' && <div className="space-y-7">
                  <Section title="Theme and layout">
                    <SelectSetting label="Theme" value={appearance.theme} onChange={(value) => updateSection('appearance', 'theme', value)} options={[["LIGHT", 'Light'], ["DARK", 'Dark'], ["SYSTEM", 'System']]} />
                    <SelectSetting label="Font size" value={appearance.fontSize} onChange={(value) => updateSection('appearance', 'fontSize', value)} options={[["SMALL", 'Small'], ["MEDIUM", 'Medium'], ["LARGE", 'Large']]} />
                    <SelectSetting label="Message density" value={appearance.bubbleDensity} onChange={(value) => updateSection('appearance', 'bubbleDensity', value)} options={[["COMFORTABLE", 'Comfortable'], ["COMPACT", 'Compact']]} />
                    <Toggle checked={appearance.compactMode} onChange={(value) => updateSection('appearance', 'compactMode', value)} label="Compact mode" description="Reduces spacing in the conversation list and settings." />
                    <div className="py-3"><span className="block text-sm font-semibold text-gray-900 dark:text-white">Accent color</span><div className="mt-3 flex gap-3">{['#0fa384', '#2563eb', '#e11d48', '#7c3aed'].map((color) => <button key={color} type="button" onClick={() => updateSection('appearance', 'accentColor', color)} className={`h-8 w-8 rounded-full border-2 ${appearance.accentColor === color ? 'border-gray-900 dark:border-white' : 'border-transparent'}`} style={{ backgroundColor: color }} aria-label={`Use accent ${color}`} />)}</div></div>
                  </Section>
                  <SaveButton busy={busyAction === 'save-appearance'} onClick={() => saveSection('appearance')} />
                </div>}

                {tab === 'media' && <div className="space-y-7">
                  <Section title="Media behavior" description="Server upload limits and signature validation remain enforced regardless of these device preferences.">
                    <Toggle checked={settings.media.autoDownloadImages} onChange={(value) => updateSection('media', 'autoDownloadImages', value)} label="Auto-load images" />
                    <Toggle checked={settings.media.autoDownloadVideos} onChange={(value) => updateSection('media', 'autoDownloadVideos', value)} label="Auto-load videos" />
                    <Toggle disabled checked={false} onChange={() => {}} label="Auto-load documents" description="Disabled by security policy. Documents always require an explicit click." />
                    <Toggle checked={settings.media.linkPreviews} onChange={(value) => updateSection('media', 'linkPreviews', value)} label="Link previews" />
                    <Toggle checked={settings.media.blockUnknownAttachments} onChange={(value) => updateSection('media', 'blockUnknownAttachments', value)} label="Block unknown attachments" description="Neosis already requires accepted contacts; this adds a stricter privacy preference for future message requests." />
                  </Section>
                  <SaveButton busy={busyAction === 'save-media'} onClick={() => saveSection('media')} />
                  <button type="button" onClick={() => run('clear-cache', async () => { if ('caches' in window) await Promise.all((await caches.keys()).filter((key) => /media|runtime/i.test(key)).map((key) => caches.delete(key))); setNotice('Cached media cleared on this device.'); })} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:border-[#323d38] dark:text-gray-200">Clear cached media</button>
                </div>}

                {tab === 'blocked' && <div className="space-y-7">
                  <Section title="Blocked users" description="Blocked users cannot send requests, messages, files, typing events, or calls in either direction.">
                    {busyAction === 'load-blocked' && <div className="flex items-center gap-2 py-4 text-sm text-gray-500"><Loader2 size={16} className="animate-spin" /> Loading blocked users</div>}
                    {blockedUsers.map((blocked) => <div key={blocked.email} className="flex items-center justify-between gap-4 py-3"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">{blocked.name || blocked.email}</span><span className="block truncate text-xs text-gray-500 dark:text-gray-400">{blocked.email}</span></span><button type="button" onClick={() => run(`unblock-${blocked.email}`, async () => { await api.delete(`/api/safety/blocked/${encodeURIComponent(blocked.email)}`); setBlockedUsers((items) => items.filter((item) => item.email !== blocked.email)); setNotice('User unblocked.'); })} className="text-xs font-bold text-[#0fa384]">Unblock</button></div>)}
                    {busyAction !== 'load-blocked' && blockedUsers.length === 0 && <p className="py-3 text-sm text-gray-500">You have not blocked anyone.</p>}
                  </Section>
                </div>}

                {tab === 'data' && <div className="space-y-7">
                  <Section title="Privacy notice" description="Review what Neosis stores, how it is used, and the limits of disappearing messages and account deletion.">
                    <a href="/privacy.html" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#0fa384]">Open privacy notice <ExternalLink size={14} /></a>
                  </Section>
                  <Section title="Download and export" description="Exports are generated only after authenticated, CSRF-protected requests and are never made public.">
                    <button type="button" onClick={() => download('/api/data/export', 'neosis-data-export.json')} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:border-[#323d38] dark:text-gray-200"><Download size={16} /> Download my data</button>
                  </Section>
                  <Section title="Clear all chats" description="This hides all existing conversations from your account on every device. It does not delete another participant's copy.">
                    <input className={`${controlClass} mt-3`} value={clearText} onChange={(event) => setClearText(event.target.value)} placeholder="Type CLEAR" />
                    <button type="button" disabled={clearText !== 'CLEAR' || busyAction === 'clear-chats'} onClick={() => run('clear-chats', async () => { await api.delete('/api/data/chats'); setClearText(''); onChatsCleared?.(); setNotice('All chats cleared for your account.'); })} className="mt-3 rounded-lg border border-amber-500/30 px-4 py-2.5 text-sm font-bold text-amber-600 disabled:opacity-40">Clear all chats</button>
                  </Section>
                  <Section title="Delete account" description="Permanently removes your profile, messages, media, contacts, settings, submitted reports, blocks, and active sessions. Reports about your account may be retained under a de-identified marker for abuse prevention.">
                    <input className={`${controlClass} mt-3 border-rose-500/30`} value={deleteText} onChange={(event) => setDeleteText(event.target.value)} placeholder="Type DELETE" />
                    <button type="button" disabled={deleteText !== 'DELETE' || busyAction === 'delete'} onClick={() => run('delete', onDeleteAccount)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">{busyAction === 'delete' ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Delete account permanently</button>
                  </Section>
                </div>}
              </main>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
