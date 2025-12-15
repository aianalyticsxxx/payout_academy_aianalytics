import { Suspense } from 'react';
import { LoginPageClient } from './LoginPageClient';

// ==========================================
// LOADING FALLBACK
// ==========================================
function LoginFormFallback() {
  return (
    <div className="relative z-10 w-full max-w-md mx-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-teal-400 tracking-tight">ZALOGCHE</h1>
        <p className="text-zinc-400 mt-4">Loading...</p>
      </div>
      <div className="backdrop-blur-xl bg-zinc-900/70 border border-white/10 rounded-3xl p-8 animate-pulse">
        <div className="h-12 bg-zinc-800/50 rounded-xl mb-4" />
        <div className="h-12 bg-zinc-800/50 rounded-xl mb-4" />
        <div className="h-12 bg-teal-500/30 rounded-xl" />
      </div>
    </div>
  );
}

// ==========================================
// MAIN LOGIN PAGE (Server Component)
// ==========================================
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginPageClient />
    </Suspense>
  );
}
