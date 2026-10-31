'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Mail, ArrowLeft, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    message: string;
    devResetUrl?: string;
    deliveredVia: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to request password reset');
        return;
      }

      setResult({
        message: data.message,
        devResetUrl: data.devResetUrl,
        deliveredVia: data.deliveredVia
      });
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
        <h2 className="text-2xl font-bold tracking-tight text-white">Reset your password</h2>
        <p className="mt-2 text-xs text-slate-400">
          Enter your registered email address to receive password reset instructions.
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

          {result ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-emerald-950/40 border border-emerald-800/50 p-4 text-xs text-emerald-300 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold block">Instructions Dispatched</span>
                  <p>{result.message}</p>
                </div>
              </div>

              {result.devResetUrl && (
                <div className="rounded-lg bg-indigo-950/40 border border-indigo-800/50 p-4 text-xs text-indigo-300 space-y-2">
                  <span className="font-semibold block text-white">Development Testing Environment:</span>
                  <p className="text-slate-300">
                    External SMTP is not configured. You can use the generated single-use reset link directly below:
                  </p>
                  <Link
                    href={result.devResetUrl}
                    className="inline-flex items-center gap-1.5 font-mono text-[11px] text-indigo-400 hover:text-indigo-300 underline break-all"
                  >
                    <span>Click here to complete password reset</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </Link>
                </div>
              )}

              <div className="pt-2">
                <Link
                  href="/auth/login"
                  className="w-full flex justify-center items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none disabled:opacity-50 transition-colors"
              >
                <Mail className="h-4 w-4" />
                <span>{isLoading ? 'Processing...' : 'Send Reset Link'}</span>
              </button>

              <div className="pt-2 text-center">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-300"
                >
                  <ArrowLeft className="h-3 w-3" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
