'use client';

import React, { useState } from 'react';
import { translations } from '@/lib/i18n';
import { JourneyTestResult } from '@/lib/services/testingSuite';
import { Language } from '@/lib/types';
import { ShieldCheck, Play, CheckCircle2, XCircle, RefreshCw, AlertCircle } from 'lucide-react';

interface TestingSuiteSectionProps {
  initialResults?: JourneyTestResult[];
  lang: Language;
}

export const TestingSuiteSection: React.FC<TestingSuiteSectionProps> = ({
  initialResults = [],
  lang
}) => {
  const t = translations[lang];

  const [results, setResults] = useState<JourneyTestResult[]>(initialResults);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [lastExecuted, setLastExecuted] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRunAllTests = async () => {
    setIsRunning(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'run_e2e_tests' })
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.result)) {
        setResults(data.result);
        setLastExecuted(new Date().toLocaleTimeString());
      } else {
        setErrorMsg(data.error || 'Verification suite failed to execute.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error running verification suite.');
    } finally {
      setIsRunning(false);
    }
  };

  const totalTests = results.length;
  const passedTests = results.filter((r) => r.passed).length;

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-300 flex items-center justify-between gap-2">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-white px-1">✕</button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-400" />
            <h2 className="text-base font-bold tracking-tight text-white">
              End-to-End User Journey Verification Suite (Journeys A through L)
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Executes empirical database assertions verifying all 12 core user journeys specified in Section 26 of the master spec.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {totalTests > 0 && (
            <div className="text-xs font-mono">
              <span className="text-emerald-400 font-bold">{passedTests}</span>
              <span className="text-slate-500"> / </span>
              <span className="text-white font-bold">{totalTests}</span>
              <span className="text-slate-400 ml-1.5">Passed</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleRunAllTests}
            disabled={isRunning}
            className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-500 transition-colors shadow-sm disabled:opacity-50"
          >
            {isRunning ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            <span>{isRunning ? 'Running Live Assertions...' : 'Execute All 12 Journeys'}</span>
          </button>
        </div>
      </div>

      {lastExecuted && (
        <div className="text-[11px] font-mono text-slate-400">
          Last verification executed at: {lastExecuted}
        </div>
      )}

      {/* Journeys List */}
      {results.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-3">
          <AlertCircle className="mx-auto h-8 w-8 text-amber-400/80" />
          <h3 className="text-sm font-semibold text-white">
            Ready to Verify Community OS Architecture
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Click &quot;Execute All 12 Journeys&quot; above to run automated regression checks against multi-tenancy, NeedSignal, QuestLoop, TrustGraph, Poll2Plan, and Discord/Telegram adapters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((res, idx) => (
            <div
              key={idx}
              className={`rounded-xl border p-5 space-y-3 transition-colors ${
                res.passed
                  ? 'border-emerald-900/40 bg-emerald-950/10'
                  : 'border-rose-900/40 bg-rose-950/10'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block mb-0.5">
                    {res.journeyCode}
                  </span>
                  <h4 className="text-xs font-bold text-white">
                    {res.title}
                  </h4>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {res.passed ? (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Passed</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-rose-400 bg-rose-950/60 border border-rose-800/40 px-2 py-0.5 rounded">
                      <XCircle className="h-3 w-3" />
                      <span>Failed</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Steps breakdown */}
              <div className="space-y-2 pt-2 border-t border-slate-800/60 text-xs">
                {res.steps.map((st, sIdx) => (
                  <div key={sIdx} className="space-y-0.5">
                    <div className="flex items-start gap-2">
                      {st.passed ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <span className="text-slate-300 font-medium">{st.step}</span>
                    </div>
                    {st.evidence && (
                      <div className="ml-5 text-[11px] font-mono text-slate-400">
                        Evidence: {st.evidence}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
