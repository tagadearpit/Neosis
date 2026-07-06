import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Lock, Shield, Sparkles, AlertTriangle } from 'lucide-react';
import { BACKEND_URL } from '../api';

export default function Login() {
  const [toasts, setToasts] = useState([]);

  const packets = useMemo(() => Array.from({ length: 7 }).map((_, i) => ({
    id: i,
    top: `${12 + i * 13}%`,
    duration: `${6 + i * 1.1}s`,
    delay: `${i * 0.55}s`
  })), []);

  const addToast = (text, type = 'info') => {
    const toast = { id: crypto.randomUUID?.() || String(Date.now()), text, type };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== toast.id)), 3200);
  };

  const handleGoogleLogin = () => {
    addToast('Opening Google secure sign-in...', 'info');
    window.location.href = `${BACKEND_URL}/oauth2/authorization/google`;
  };

  return (
    <div className="min-h-screen bg-[#060e20] text-[#dae2fd] font-sans relative overflow-hidden bg-mesh antialiased flex items-center justify-center p-5">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        {packets.map((packet) => (
          <div key={packet.id} className="absolute w-1 h-1 bg-[#4edea3] rounded-full blur-[1px]" style={{ top: packet.top, left: '-5%', animation: `packet ${packet.duration} linear infinite`, animationDelay: packet.delay }} />
        ))}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes packet {
          0% { transform: translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(115vw); opacity: 0; }
        }
      ` }} />

      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto bg-[#131b2e] border border-[#4edea3]/20 rounded-lg px-4 py-3 flex items-start gap-3 shadow-xl custom-glow-card">
            {toast.type === 'error' ? <AlertTriangle className="text-[#ffb4ab] w-5 h-5 shrink-0" /> : <CheckCircle2 className="text-[#4edea3] w-5 h-5 shrink-0" />}
            <div>
              <p className="text-xs font-mono font-bold text-[#4edea3] uppercase tracking-wider">Secure Signal</p>
              <p className="text-xs text-[#dae2fd]">{toast.text}</p>
            </div>
          </div>
        ))}
      </div>

      <main className="w-full max-w-[450px] bg-[#131b2e]/95 border border-[#2d3449] rounded-3xl custom-glow-card relative flex flex-col px-7 py-8 sm:px-10 sm:py-10 shadow-2xl backdrop-blur-xl">
        <div className="absolute inset-0 rounded-3xl pointer-events-none border border-[#4edea3]/10" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#0fa384]/20 blur-3xl rounded-full pointer-events-none" />

        <div className="relative flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#0fa384]/10 border border-[#4edea3]/20 flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(15,163,132,0.18)]">
            <Lock className="w-8 h-8 text-[#4edea3]" />
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-white">NEOSIS</h1>
          <p className="mt-3 text-sm leading-6 text-[#bbcabf] max-w-sm">
            Real-time private chat with contacts, documents, media messages, and call signaling protected by Google authentication.
          </p>
        </div>

        <div className="relative grid gap-3 mb-7">
          <div className="flex items-start gap-3 rounded-2xl bg-[#171f33] border border-[#3c4a42]/70 p-4">
            <Shield className="w-5 h-5 text-[#4edea3] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">Google-only sign-in</p>
              <p className="text-xs text-[#bbcabf] mt-1">No fake password or recovery phrase flow. Identity is handled through OAuth.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl bg-[#171f33] border border-[#3c4a42]/70 p-4">
            <Sparkles className="w-5 h-5 text-[#4edea3] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">Cleaner security model</p>
              <p className="text-xs text-[#bbcabf] mt-1">Sessions, CSRF protection, and user-specific WebSocket queues are handled by the backend.</p>
            </div>
          </div>
        </div>

        <button type="button" onClick={handleGoogleLogin} className="relative w-full rounded-2xl bg-[#4edea3] text-[#00422b] font-mono text-xs font-extrabold uppercase tracking-[0.18em] py-4 px-5 flex items-center justify-center gap-3 hover:bg-[#6ffbbe] active:scale-[0.99] transition-all shadow-[0_18px_40px_rgba(15,163,132,0.18)]">
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          <span>Continue with Google</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="relative mt-6 text-center text-[11px] leading-5 text-[#bbcabf]">
          By continuing, you agree to use Neosis for lawful personal communication only. Terms acceptance is recorded after sign-in.
        </p>
      </main>
    </div>
  );
}
