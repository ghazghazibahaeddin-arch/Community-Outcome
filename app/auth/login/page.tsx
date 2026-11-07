'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, LogIn, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = (await res.json()) as any;

      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid email or password');
        return;
      }

      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Community OS</span>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-white">Sign in to your account</h2>
        <p className="mt-2 text-xs text-slate-400">
          Or{' '}
          <Link href="/auth/signup" className="font-medium text-indigo-400 hover:text-indigo-300">
            create a new member account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/80 border border-slate-800 py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 rounded-lg bg-rose-950/40 border border-rose-800/50 p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-medium text-slate-300">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-300">Password</label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none disabled:opacity-50 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              <span>{isLoading ? 'Signing in...' : 'Sign in'}</span>
            </button>
          </form>

          <div className="mt-6 border-t border-slate-800/80 pt-4 text-center">
            <p className="text-xs text-slate-400">
              Demo credentials:{' '}
              <span className="font-mono text-slate-300">sarah@communityos.org</span> /{' '}
              <span className="font-mono text-slate-300">Password123!</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
