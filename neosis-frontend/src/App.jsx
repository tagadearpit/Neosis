import React, { lazy, Suspense, useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { RefreshCw, ServerOff, ShieldCheck } from 'lucide-react';
import Login from './components/Login';
import { AuthContext, AuthProvider } from './context/AuthContext';

const NeosisChatWrapped = lazy(() => import('./components/NeosisChat'));

const SESSION_STEPS = [
  'Establishing secure channel',
  'Validating authenticated session',
  'Synchronizing your workspace'
];

function SessionLoader() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveStep((current) => (current + 1) % SESSION_STEPS.length);
    }, 900);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#050b18] text-[#dae2fd]"
      role="status"
      aria-live="polite"
      aria-label="Verifying your secure Neosis session"
    >
      <style>{`
        @keyframes loader-grid-drift {
          from { transform: perspective(700px) rotateX(64deg) translateY(-5%); }
          to { transform: perspective(700px) rotateX(64deg) translateY(5%); }
        }

        @keyframes loader-orbit-clockwise {
          to { transform: rotate(360deg); }
        }

        @keyframes loader-orbit-counter {
          to { transform: rotate(-360deg); }
        }

        @keyframes loader-core-breathe {
          0%, 100% {
            transform: scale(0.94);
            box-shadow: 0 0 24px rgba(78, 222, 163, 0.18), inset 0 0 22px rgba(78, 222, 163, 0.05);
          }
          50% {
            transform: scale(1);
            box-shadow: 0 0 58px rgba(78, 222, 163, 0.34), inset 0 0 30px rgba(78, 222, 163, 0.09);
          }
        }

        @keyframes loader-scan {
          0% { transform: translateY(-150%); opacity: 0; }
          18% { opacity: 0.65; }
          82% { opacity: 0.65; }
          100% { transform: translateY(150%); opacity: 0; }
        }

        @keyframes loader-beam {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(320%); }
        }

        @keyframes loader-particle {
          0%, 100% { transform: translate3d(0, 0, 0) scale(0.7); opacity: 0.15; }
          50% { transform: translate3d(0, -18px, 0) scale(1); opacity: 0.9; }
        }

        @keyframes loader-dot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.32; }
          40% { transform: translateY(-4px); opacity: 1; }
        }

        @keyframes loader-status-in {
          from { opacity: 0; transform: translateY(7px); filter: blur(4px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .neosis-loader-animated {
            animation: none !important;
          }
        }
      `}</style>

      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(15,163,132,0.17), transparent 25%), radial-gradient(circle at 18% 20%, rgba(68,102,255,0.11), transparent 30%), radial-gradient(circle at 84% 76%, rgba(78,222,163,0.08), transparent 30%), linear-gradient(145deg, #050b18 0%, #081225 48%, #050b18 100%)'
        }}
      />

      <div className="pointer-events-none absolute inset-x-[-20%] bottom-[-58%] h-[115%] overflow-hidden opacity-30 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black)]">
        <div
          className="neosis-loader-animated h-full w-full origin-center"
          style={{
            backgroundImage:
              'linear-gradient(rgba(78,222,163,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(78,222,163,0.16) 1px, transparent 1px)',
            backgroundSize: '52px 52px',
            animation: 'loader-grid-drift 5s ease-in-out infinite alternate'
          }}
        />
      </div>

      <div className="pointer-events-none absolute inset-0">
        {[
          ['12%', '18%', '0s'],
          ['23%', '76%', '0.7s'],
          ['76%', '16%', '1.1s'],
          ['84%', '64%', '0.3s'],
          ['64%', '84%', '1.5s'],
          ['37%', '9%', '1.9s'],
          ['9%', '57%', '2.2s'],
          ['91%', '36%', '2.6s']
        ].map(([left, top, delay], index) => (
          <span
            key={`${left}-${top}`}
            className="neosis-loader-animated absolute h-1 w-1 rounded-full bg-[#6ffbbe] shadow-[0_0_12px_rgba(111,251,190,0.9)]"
            style={{
              left,
              top,
              animation: `loader-particle ${2.8 + (index % 3) * 0.55}s ease-in-out ${delay} infinite`
            }}
          />
        ))}
      </div>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
        <section className="flex w-full max-w-md flex-col items-center text-center">
          <div className="relative mb-10 h-52 w-52 sm:h-60 sm:w-60">
            <div className="absolute inset-0 rounded-full bg-[#0fa384]/10 blur-3xl" />

            <div
              className="neosis-loader-animated absolute inset-2 rounded-full border border-[#4edea3]/10 border-t-[#4edea3]/70"
              style={{ animation: 'loader-orbit-clockwise 4.8s linear infinite' }}
            >
              <span className="absolute left-1/2 top-[-5px] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#76ffd0] shadow-[0_0_18px_rgba(118,255,208,0.95)]" />
            </div>

            <div
              className="neosis-loader-animated absolute inset-8 rounded-full border border-dashed border-[#7ea6ff]/25 border-r-[#7ea6ff]/80"
              style={{ animation: 'loader-orbit-counter 7s linear infinite' }}
            >
              <span className="absolute bottom-[8%] right-[8%] h-2 w-2 rounded-full bg-[#93adff] shadow-[0_0_15px_rgba(147,173,255,0.85)]" />
            </div>

            <div className="absolute inset-[3.35rem] rounded-[2rem] border border-[#4edea3]/20 bg-[#0b1628]/88 p-2 shadow-[0_24px_80px_rgba(0,0,0,0.48)] backdrop-blur-xl sm:inset-[4rem]">
              <div
                className="neosis-loader-animated relative flex h-full w-full items-center justify-center overflow-hidden rounded-[1.55rem] border border-[#4edea3]/20 bg-[linear-gradient(145deg,rgba(21,42,58,0.92),rgba(7,18,31,0.96))]"
                style={{ animation: 'loader-core-breathe 2.4s ease-in-out infinite' }}
              >
                <div
                  className="neosis-loader-animated absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-[#4edea3]/20 to-transparent blur-sm"
                  style={{ animation: 'loader-scan 2.6s ease-in-out infinite' }}
                />
                <ShieldCheck className="relative z-10 h-12 w-12 text-[#6ffbbe] drop-shadow-[0_0_14px_rgba(111,251,190,0.48)]" strokeWidth={1.45} />
              </div>
            </div>

            <span className="absolute left-[8%] top-[51%] h-px w-8 bg-gradient-to-r from-transparent to-[#4edea3]/55" />
            <span className="absolute right-[8%] top-[51%] h-px w-8 bg-gradient-to-l from-transparent to-[#4edea3]/55" />
          </div>

          <div className="mb-3 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.38em] text-[#70e7ba]">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-[#4edea3]/60" />
            Neosis Secure Access
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-[#4edea3]/60" />
          </div>

          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white sm:text-3xl">
            Preparing your private space
          </h1>

          <div className="mt-4 h-6 overflow-hidden">
            <p
              key={activeStep}
              className="neosis-loader-animated font-mono text-xs tracking-wide text-[#9fb0bf]"
              style={{ animation: 'loader-status-in 420ms ease-out both' }}
            >
              {SESSION_STEPS[activeStep]}
              <span className="ml-1 inline-flex gap-1" aria-hidden="true">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="neosis-loader-animated inline-block h-1 w-1 rounded-full bg-[#4edea3]"
                    style={{ animation: `loader-dot 1.2s ease-in-out ${dot * 0.16}s infinite` }}
                  />
                ))}
              </span>
            </p>
          </div>

          <div className="mt-7 h-1.5 w-full max-w-[280px] overflow-hidden rounded-full border border-[#4edea3]/10 bg-[#101a2b] shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
            <div className="relative h-full w-full overflow-hidden rounded-full bg-[linear-gradient(90deg,rgba(78,222,163,0.12),rgba(78,222,163,0.5),rgba(126,166,255,0.22))]">
              <span
                className="neosis-loader-animated absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/75 to-transparent blur-[1px]"
                style={{ animation: 'loader-beam 1.65s ease-in-out infinite' }}
              />
            </div>
          </div>

          <p className="mt-5 max-w-sm text-[11px] leading-5 text-[#718296]">
            Authentication is being verified with the Neosis backend. This normally completes in a moment.
          </p>
        </section>
      </main>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, sessionError, refreshSession } = useContext(AuthContext);
  if (isLoading) return <SessionLoader />;
  if (sessionError && !isAuthenticated) return <SessionUnavailable message={sessionError} onRetry={refreshSession} />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated, isLoading, sessionError, refreshSession } = useContext(AuthContext);
  if (isLoading) return <SessionLoader />;
  if (sessionError && !isAuthenticated) return <SessionUnavailable message={sessionError} onRetry={refreshSession} />;
  return isAuthenticated ? <Navigate to="/chat" replace /> : children;
}

function SessionUnavailable({ message, onRetry }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050b18] px-6 text-[#dae2fd]">
      <section className="w-full max-w-md rounded-lg border border-[#2d3449] bg-[#131b2e] p-8 text-center shadow-2xl">
        <ServerOff className="mx-auto h-11 w-11 text-[#ffb4ab]" aria-hidden="true" />
        <h1 className="mt-5 font-display text-2xl font-semibold text-white">Neosis is taking longer to respond</h1>
        <p className="mt-3 text-sm leading-6 text-[#aebbd1]">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-7 inline-flex items-center gap-2 rounded-lg bg-[#4edea3] px-5 py-3 text-sm font-bold text-[#00422b] transition-colors hover:bg-[#6ffbbe]"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Retry connection
        </button>
      </section>
    </main>
  );
}

function ChatRoute() {
  return (
    <Suspense fallback={<SessionLoader />}>
      <NeosisChatWrapped />
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><ChatRoute /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatRoute /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
