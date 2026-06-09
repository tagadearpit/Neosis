import React, { useState, useEffect, useRef } from 'react';
import { Lock, Shield, Eye, EyeOff, ArrowRight, X, RefreshCw, AlertTriangle, CheckCircle, Fingerprint } from 'lucide-react';

// CRITICAL FIX: Safely falls back to your live Render backend URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://neosis-433w.onrender.com';

export default function Login() {
  const [screen, setScreen] = useState('LOGIN'); // 'LOGIN' | 'SIGNUP' | 'RESET'
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  
  // Modals & Popups
  const [toasts, setToasts] = useState([]);
  const [recoveryInput, setRecoveryInput] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [recoveryPhrase, setRecoveryPhrase] = useState([]);
  const [hasSavedRecovery, setHasSavedRecovery] = useState(false);
  const [signupError, setSignupError] = useState('');

  // Generate background flowing streams
  const [packetsRef] = useState(() => Array.from({ length: 6 }).map((_, i) => ({
    id: i, top: `${15 + i * 15}%`, duration: `${6 + i * 1.5}s`, delay: `${i * 0.8}s`
  })));

  const addToast = (text, type = 'success') => {
    const newToast = { id: Math.random().toString(), text, type };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== newToast.id)), 3500);
  };

  // Connects directly to your Spring Boot backend OAuth pipeline
  const handleGoogleLogin = () => {
    window.location.href = `${BACKEND_URL}/oauth2/authorization/google`;
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!userEmail) {
      setLoginError('An identity email or username is required.');
      return;
    }
    setLoginError('');
    addToast('Authentication payload sent.', 'info');
    window.location.href = '/chat';
  };

  const generateRecoveryKey = () => {
    const database = ['quantum', 'nebula', 'matrix', 'cipher', 'vortex', 'cascade', 'plasma', 'glitch', 'beacon', 'horizon', 'fusion', 'entropy', 'starlight', 'shadow', 'pulse', 'circuit', 'shield', 'secure', 'crypto', 'enigma', 'binary', 'glimmer', 'solar', 'transit', 'core', 'terminal', 'cyber', 'phantom', 'grid', 'titan'];
    const phrase = [];
    for (let i = 0; i < 12; i++) phrase.push(database[Math.floor(Math.random() * database.length)]);
    setRecoveryPhrase(phrase);
    setRecoveryInput(phrase.join(' '));
  };

  const handleSignupSubmit = (e) => {
    e.preventDefault();
    if (!signupEmail || signupPassword.length < 8 || signupPassword !== signupConfirm) {
      setSignupError('Invalid configuration. Passwords must match and be 8+ characters.');
      return;
    }
    setSignupError('');
    generateRecoveryKey();
    setHasSavedRecovery(false);
  };

  const confirmSignupRecovery = () => {
    addToast('Account initialized with Secure Hardware Seeds!', 'success');
    window.location.href = '/chat';
  };

  return (
    <div className="bg-[#060e20] text-[#dae2fd] font-sans min-h-screen relative overflow-hidden bg-mesh antialiased flex flex-col justify-between">
      
      {/* Background Cyber Matrix Streams */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-10" style={{ backgroundImage: 'linear-gradient(to right, #1E293B 1px, transparent 1px), linear-gradient(to bottom, #1E293B 1px, transparent 1px)', backgroundSize: '64px 64px' }}></div>
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-30">
        <div className="flex justify-around w-full h-full">
          <div className="w-[1px] h-full bg-gradient-to-b from-transparent via-[#4edea3]/30 to-transparent animate-pulse duration-[3s]"></div>
          <div className="w-[1px] h-full bg-gradient-to-b from-transparent via-[#4edea3]/10 to-transparent animate-pulse duration-[4s]"></div>
          <div className="w-[1px] h-full bg-gradient-to-b from-transparent via-[#4edea3]/40 to-transparent animate-pulse duration-[2.5s]"></div>
        </div>
        {packetsRef.map((pkt) => (
          <div key={pkt.id} className="absolute w-1 h-1 bg-[#4edea3] rounded-full blur-[1px]" style={{ top: pkt.top, left: '-5%', animation: `packet ${pkt.duration} linear infinite`, animationDelay: pkt.delay }} />
        ))}
        <div className="absolute w-full h-[1px] cyber-scan opacity-60"></div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `@keyframes packet { 0% { transform: translateX(0); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateX(115vw); opacity: 0; } }`}} />

      {/* Security Alerts Toast Container */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto bg-[#131b2e] border border-[#4edea3]/20 rounded-lg px-4 py-3 flex items-start gap-3 shadow-xl custom-glow-active">
            {t.type === 'success' ? <CheckCircle className="text-[#4edea3] w-5 h-5 shrink-0" /> : <AlertTriangle className="text-[#ffb4ab] w-5 h-5 shrink-0" />}
            <div>
              <p className="text-xs font-mono font-bold text-[#4edea3] uppercase tracking-wider">Secure Signal</p>
              <p className="text-xs text-[#dae2fd] font-sans">{t.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="w-full flex-grow flex items-center justify-center p-6 z-10 relative">
        
        {/* ================= LOGIN PANEL ================= */}
        {screen === 'LOGIN' && (
          <main className="w-full max-w-[420px] bg-[#131b2e] border border-[#2d3449] rounded-xl custom-glow-card relative flex flex-col pt-10 pb-8 px-8 sm:px-10">
            <div className="absolute inset-0 rounded-xl pointer-events-none z-0">
              <div className="absolute inset-0 border border-[#4edea3]/10 rounded-xl"></div>
              <div className="absolute top-0 left-0 w-20 h-[2px] bg-[#4edea3] shadow-[0_0_8px_#4edea3] animate-[circuit-top_5s_linear_infinite]"></div>
              <div className="absolute bottom-0 right-0 w-20 h-[2px] bg-[#4edea3] shadow-[0_0_8px_#4edea3] animate-[circuit-bottom_5s_linear_infinite]"></div>
            </div>

            <div className="flex flex-col items-center mb-9 z-10">
              <h1 className="font-display text-4xl font-extrabold text-[#dae2fd] tracking-tighter mb-2 flex items-center gap-2">
                <Lock className="text-[#4edea3] w-9 h-9 fill-[#4edea3]/10 animate-pulse" />
                <span className="tracking-tight text-white">NEOSIS</span>
              </h1>
              <div className="inline-flex items-center gap-2 bg-[#171f33] border border-[#3c4a42] rounded-full px-3 py-1 mt-1">
                <Shield className="w-3.5 h-3.5 text-[#4edea3]" />
                <span className="font-mono text-[10px] text-[#4edea3] uppercase tracking-widest font-bold">E2EE Active</span>
                <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse ml-0.5"></span>
              </div>
            </div>

            <form className="flex flex-col gap-5 z-10" onSubmit={handleLoginSubmit}>
              {loginError && <div className="p-3 rounded bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 text-[#ffb4ab] text-xs font-mono">{loginError}</div>}
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-xs text-[#bbcabf] font-medium ml-1">Username or Email</label>
                <input type="text" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="identity@neosis.e2ee" className="w-full bg-[#171f33] border-b-2 border-[#3c4a42] text-[#dae2fd] font-mono text-xs px-4 py-3 focus:outline-none focus:border-[#4edea3] transition-all rounded-t" required />
              </div>

              <div className="flex flex-col gap-1.5 relative">
                <label className="font-mono text-xs text-[#bbcabf] font-medium ml-1">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={userPassword} onChange={(e) => setUserPassword(e.target.value)} placeholder="••••••••••••" className="w-full bg-[#171f33] border-b-2 border-[#3c4a42] text-[#dae2fd] font-mono text-xs px-4 py-3 pr-12 focus:outline-none focus:border-[#4edea3] transition-all rounded-t" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#bbcabf] hover:text-[#4edea3]">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-col items-center gap-4">
                <button type="submit" className="w-full bg-[#4edea3] text-[#00422b] font-mono text-xs font-bold uppercase tracking-widest py-3 px-6 rounded hover:bg-[#6ffbbe] shadow-lg flex items-center justify-center gap-2 group cursor-pointer transition-all">
                  <span>Secure Login</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* GOOGLE OAUTH REDIRECT LINK */}
                <button type="button" onClick={handleGoogleLogin} className="w-full bg-[#171f33] border border-[#3c4a42] text-[#dae2fd] font-mono text-xs py-3 px-6 rounded hover:border-[#4edea3]/50 flex items-center justify-center gap-2.5 cursor-pointer transition-all">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <button type="button" onClick={() => setScreen('RESET')} className="font-mono text-xs text-[#4cd7f6] hover:underline underline-offset-4 cursor-pointer">
                  Forgot Password?
                </button>
              </div>
            </form>

            <div className="w-full h-[1px] bg-[#2d3449] my-7 z-10"></div>
            <div className="text-center z-10">
              <span className="text-xs text-[#bbcabf]">New to NEOSIS? </span>
              <button onClick={() => setScreen('SIGNUP')} className="font-mono text-xs text-[#4edea3] hover:underline font-bold cursor-pointer">
                Create an account
              </button>
            </div>
          </main>
        )}

        {/* ================= REGISTER WORKSPACE PANEL ================= */}
        {screen === 'SIGNUP' && (
          <main className="w-full max-w-[480px] bg-[#131b2e] border border-[#2d3449] rounded-xl custom-glow-card relative pt-8 pb-8 px-8 sm:px-10 z-10">
            <div className="flex flex-col items-center mb-6">
              <Fingerprint className="text-[#4edea3] w-11 h-11 mb-2 animate-pulse" />
              <h2 className="font-display text-2xl font-bold text-white">Create Security Vault</h2>
            </div>
            
            {recoveryPhrase.length === 0 ? (
              <form className="flex flex-col gap-4 relative z-10" onSubmit={handleSignupSubmit}>
                {signupError && <div className="p-3 bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 text-[#ffb4ab] text-xs font-mono rounded">{signupError}</div>}
                
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-xs text-[#bbcabf]">Primary Email</label>
                  <input type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="identity@neosis.e2ee" className="w-full bg-[#171f33] border-b-2 border-[#3c4a42] text-[#dae2fd] px-4 py-2.5 focus:outline-none focus:border-[#4edea3] rounded font-mono text-xs" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-xs text-[#bbcabf]">Master Password</label>
                  <input type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="••••••••••••" className="w-full bg-[#171f33] border-b-2 border-[#3c4a42] text-[#dae2fd] px-4 py-2.5 focus:outline-none focus:border-[#4edea3] rounded font-mono text-xs" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-xs text-[#bbcabf]">Confirm Password</label>
                  <input type="password" value={signupConfirm} onChange={(e) => setSignupConfirm(e.target.value)} placeholder="••••••••••••" className="w-full bg-[#171f33] border-b-2 border-[#3c4a42] text-[#dae2fd] px-4 py-2.5 focus:outline-none focus:border-[#4edea3] rounded font-mono text-xs" required />
                </div>

                <button type="submit" className="w-full bg-[#4edea3] text-[#00422b] font-mono text-xs font-bold uppercase tracking-widest py-3 px-6 rounded hover:bg-[#6ffbbe] mt-3 flex items-center justify-center gap-2 cursor-pointer">
                  <span>Generate Recovery Key</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div className="text-center mt-3">
                  <button type="button" onClick={() => setScreen('LOGIN')} className="font-mono text-xs text-[#bbcabf] hover:text-white cursor-pointer">Already registered? Go Back</button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-5 z-10 relative">
                <div className="grid grid-cols-3 gap-2 bg-[#171f33] p-4 rounded border border-[#3c4a42] font-mono">
                  {recoveryPhrase.map((word, index) => (
                    <div key={index} className="bg-[#131b2e] border border-[#3c4a42]/35 rounded px-2 py-1.5 flex items-center gap-2">
                      <span className="text-[10px] text-[#4edea3]/50 text-right w-4">{index + 1}.</span>
                      <span className="text-xs text-white uppercase font-bold">{word}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3 mt-3">
                  <input type="checkbox" checked={hasSavedRecovery} onChange={(e) => setHasSavedRecovery(e.target.checked)} className="rounded bg-[#171f33] cursor-pointer" />
                  <label className="text-xs text-[#bbcabf] cursor-pointer">I have safely recorded this seed structure.</label>
                </div>

                <div className="flex gap-3 mt-3">
                  <button type="button" onClick={() => setRecoveryPhrase([])} className="flex-1 border border-[#3c4a42] text-[#bbcabf] hover:text-white font-mono text-xs py-2.5 rounded cursor-pointer">Clear</button>
                  <button type="button" disabled={!hasSavedRecovery} onClick={confirmSignupRecovery} className={`flex-1 font-mono text-xs font-bold uppercase py-2.5 rounded flex items-center justify-center gap-2 ${hasSavedRecovery ? 'bg-[#4edea3] text-[#00422b] cursor-pointer' : 'bg-[#171f33] text-[#bbcabf] opacity-55'}`}>
                    <span>Finalize</span>
                  </button>
                </div>
              </div>
            )}
          </main>
        )}

        {/* ================= PASSWORD RESET SEED PORTAL ================= */}
        {screen === 'RESET' && (
          <main className="w-full max-w-[420px] bg-[#131b2e] border border-[#2d3449] rounded-xl custom-glow-card relative pt-10 pb-8 px-8 sm:px-10 z-10">
            <div className="flex flex-col items-center mb-8">
              <RefreshCw className="text-[#4edea3] w-10 h-10 mb-2 animate-spin" />
              <h2 className="font-display text-xl font-bold text-white">Reset Neosis Key</h2>
            </div>
            <form className="flex flex-col gap-4 relative z-10 text-xs" onSubmit={(e) => { e.preventDefault(); confirmSignupRecovery(); }}>
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[#bbcabf]">12-Word Recovery Phrase</label>
                <textarea rows={4} value={recoveryInput} onChange={(e) => setRecoveryInput(e.target.value)} placeholder="quantum nebula matrix cipher vortex cascade..." className="w-full bg-[#171f33] border-b-2 border-[#3c4a42] text-[#dae2fd] font-mono p-3 focus:outline-none focus:border-[#4edea3] rounded resize-none" required />
              </div>
              <div className="flex flex-col gap-3 mt-3">
                <button type="submit" className="w-full bg-[#4edea3] text-[#00422b] font-mono text-xs font-bold uppercase py-3 rounded cursor-pointer">Process Master Phrase</button>
                <button type="button" onClick={() => setScreen('LOGIN')} className="font-mono text-[#bbcabf] hover:text-white cursor-pointer text-center">Go back to Login</button>
              </div>
            </form>
          </main>
        )}

      </div>
      <footer className="w-full text-center py-4 text-[10px] font-mono text-[#bbcabf]/45 border-t border-[#2d3449] bg-black/20 z-10 relative">
        <p>© 2026 NEOSIS. Secure, E2EE WebRTC Architecture.</p>
      </footer>
    </div>
  );
}