import React from 'react';
import { Lock, Key, ArrowRight, AlertCircle } from 'lucide-react';

interface LockScreenProps {
  operatorName: string | null;
  accessKey: string;
  setAccessKey: (val: string) => void;
  error: string | null;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  operatorName,
  accessKey,
  setAccessKey,
  error,
  loading,
  onSubmit,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 px-4 select-none">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,255,255,0.05),rgba(255,255,255,0))]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/90 p-8 shadow-2xl backdrop-blur-2xl animate-fade-in">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="relative mb-3.5 flex h-16 w-16 items-center justify-center">
            <img
              src="/icon-192.png"
              alt="Syndae AI"
              className="h-16 w-16 rounded-2xl border border-emerald-500/30 shadow-lg object-cover"
            />
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 border border-emerald-500/40 text-emerald-400 shadow-sm">
              <Lock className="h-3 w-3" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-[11px] tracking-wider text-emerald-400 font-semibold uppercase">
              Enclave Guard // Device Locked
            </span>
          </div>

          <h1 className="mt-2 text-xl font-bold tracking-tight text-zinc-100">
            Syndae Personal AI
          </h1>

          <p className="mt-1 text-xs text-zinc-400">
            {operatorName
              ? `Welcome back, ${operatorName}. Enter your access key to unlock.`
              : 'Enter your device access key to unlock your assistant.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300 animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-300">
              Device Access Key
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                <Key className="h-4 w-4" />
              </div>
              <input
                type="password"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                placeholder="••••••••••••"
                autoFocus
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 py-3 pl-10 pr-3 text-sm text-zinc-100 placeholder-zinc-600 transition-all focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 text-xs font-semibold text-white tracking-wider transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-md disabled:opacity-50 cursor-pointer uppercase"
          >
            {loading ? (
              <span>Unlocking your assistant...</span>
            ) : (
              <>
                <span>Unlock Syndae OS</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-zinc-800/80 pt-4 text-center">
          <p className="text-[10px] text-zinc-500">
            Private Personal AI • 100% on your device • No tracking or ads
          </p>
        </div>
      </div>
    </div>
  );
};
