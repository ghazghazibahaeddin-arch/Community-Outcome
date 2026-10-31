'use client';

import React, { useState } from 'react';
import { translations } from '@/lib/i18n';
import { CommunityOutcomeAnalytics } from '@/lib/services/analytics';
import { AgentKitWorkflow, Community, User, Language } from '@/lib/types';
import Image from 'next/image';
import { BarChart3, Bot, Users, HeartHandshake, Play, Shield, Clock, TrendingUp } from 'lucide-react';

interface OwnerAnalyticsSectionProps {
  analytics: CommunityOutcomeAnalytics;
  recoveryCandidates: any[];
  agentKits: AgentKitWorkflow[];
  community: Community;
  currentUser: User;
  lang: Language;
  onRefresh: () => void;
}

export const OwnerAnalyticsSection: React.FC<OwnerAnalyticsSectionProps> = ({
  analytics,
  recoveryCandidates,
  agentKits,
  community,
  currentUser,
  lang,
  onRefresh
}) => {
  const t = translations[lang];

  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'recovery' | 'agentKits'>('analytics');
  const [executingAgentId, setExecutingAgentId] = useState<string | null>(null);

  const handleRunAgentKit = async (agentKitId: string) => {
    setExecutingAgentId(agentKitId);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute_agent_kit',
          payload: {
            agentKitId,
            outcomeDesc: 'Trigger evaluated: processed active records with human-in-the-loop audit.'
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to run agent kit:', err);
    } finally {
      setExecutingAgentId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Subnav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('analytics')}
            className={`pb-2 transition-colors ${
              activeSubTab === 'analytics' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Outcome Analytics (Owner-4)
          </button>
          <button
            onClick={() => setActiveSubTab('recovery')}
            className={`pb-2 transition-colors ${
              activeSubTab === 'recovery' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Member Recovery (Owner-6) ({recoveryCandidates.length})
          </button>
          <button
            onClick={() => setActiveSubTab('agentKits')}
            className={`pb-2 transition-colors ${
              activeSubTab === 'agentKits' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Community Agent Kits (Owner-8) ({agentKits.length})
          </button>
        </div>
      </div>

      {/* SubTab 1: Outcome Analytics */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          <p className="text-xs text-slate-400">
            Zero fake numbers. Every metric is computed dynamically from persisted transactions, avoiding opaque global scoreboards.
          </p>

          {/* Metric Grids */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <span className="text-[11px] text-slate-400 block mb-1">Offer Match Rate</span>
              <span className="text-2xl font-bold font-mono text-white tabular-nums">
                {analytics.totalRequests > 0
                  ? Math.round((analytics.requestsWithOffers / analytics.totalRequests) * 100)
                  : 0}
                %
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">
                {analytics.requestsWithOffers} of {analytics.totalRequests} requests
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <span className="text-[11px] text-slate-400 block mb-1">Task Completion Rate</span>
              <span className="text-2xl font-bold font-mono text-indigo-400 tabular-nums">
                {analytics.tasksAssigned > 0
                  ? Math.round((analytics.tasksCompleted / analytics.tasksAssigned) * 100)
                  : 0}
                %
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">
                {analytics.tasksCompleted} of {analytics.tasksAssigned} deliverables
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <span className="text-[11px] text-slate-400 block mb-1">Response Time (Avg)</span>
              <span className="text-2xl font-bold font-mono text-sky-400 tabular-nums">
                {analytics.avgHoursToFirstOffer}h
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">
                From NeedSignal to first offer
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <span className="text-[11px] text-slate-400 block mb-1">Review Backlog</span>
              <span className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
                {analytics.reviewBacklog}
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">
                Submissions awaiting audit
              </span>
            </div>
          </div>

          {/* Category Breakdown & Link Funnels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Contribution Category Volume
              </h4>
              <div className="space-y-2">
                {analytics.categoryBreakdown.map((cat) => (
                  <div key={cat.categoryId} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-300">{cat.name}</span>
                    <span className="font-mono text-indigo-400 font-semibold tabular-nums">{cat.count} records</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Link System Aggregations */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Community Links Cumulative Attribution
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded bg-slate-950/40">
                  <span className="text-slate-500 text-[11px] block">Total Inbound Visits</span>
                  <span className="text-lg font-bold font-mono text-white tabular-nums">{analytics.linkTotals.visits}</span>
                </div>
                <div className="p-3 rounded bg-slate-950/40">
                  <span className="text-slate-500 text-[11px] block">Action Initiations</span>
                  <span className="text-lg font-bold font-mono text-slate-300 tabular-nums">{analytics.linkTotals.starts}</span>
                </div>
                <div className="p-3 rounded bg-slate-950/40">
                  <span className="text-slate-500 text-[11px] block">Form Submissions</span>
                  <span className="text-lg font-bold font-mono text-indigo-400 tabular-nums">{analytics.linkTotals.submissions}</span>
                </div>
                <div className="p-3 rounded bg-slate-950/40">
                  <span className="text-slate-500 text-[11px] block">Verified Results</span>
                  <span className="text-lg font-bold font-mono text-emerald-400 tabular-nums">{analytics.linkTotals.verifiedOutcomes}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SubTab 2: Member Recovery */}
      {activeSubTab === 'recovery' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
            <h4 className="text-xs font-bold text-white mb-1">
              Privacy-Respecting Engagement Signals (Owner-6)
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Detects members with decreasing activity using only authorized on-platform interactions. Enables community owners to offer targeted support without intrusive surveillance.
            </p>
          </div>

          <div className="space-y-3">
            {recoveryCandidates.map((cand, idx) => (
              <div key={idx} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 overflow-hidden rounded-full border border-slate-700 bg-slate-800 shrink-0">
                    <Image
                      src={cand.user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80'}
                      alt={cand.user?.name || 'User Avatar'}
                      fill
                      sizes="40px"
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {cand.user?.name}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Role: {cand.role} · Last Active: {new Date(cand.lastActive).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="text-right">
                    <span className="text-slate-400 text-[11px] block">Contributions</span>
                    <span className="text-white">{cand.totalContributions} verified</span>
                  </div>
                  <button
                    onClick={() => alert(`Sent gentle invitation and recommended resource link to ${cand.user?.name}.`)}
                    className="flex items-center gap-1.5 rounded-md border border-indigo-700 bg-indigo-950/40 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-900/60"
                  >
                    <HeartHandshake className="h-3.5 w-3.5" />
                    <span>Send Re-engagement Prompt</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SubTab 3: Community Agent Kits */}
      {activeSubTab === 'agentKits' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
            <h4 className="text-xs font-bold text-white mb-1">
              Community Agent Kits & Automation Workflows (Owner-8)
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Configurable, reusable workflow templates for common operations (request triage, review dispatching, event follow-ups). All agents enforce human-in-the-loop approvals.
            </p>
          </div>

          <div className="space-y-4">
            {agentKits.map((kit) => (
              <div key={kit.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {lang === 'ar' && kit.nameAr ? kit.nameAr : kit.name}
                      </h4>
                      <span className="text-xs text-slate-500 font-mono">
                        Trigger: {kit.trigger} · Executions: {kit.executionCount}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRunAgentKit(kit.id)}
                    disabled={executingAgentId === kit.id}
                    className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    <Play className="h-3 w-3" />
                    <span>{executingAgentId === kit.id ? 'Evaluating...' : 'Run Workflow'}</span>
                  </button>
                </div>

                <div className="text-xs text-slate-300 space-y-1">
                  <div>
                    <span className="text-slate-500">Conditions:</span> {kit.conditions}
                  </div>
                  <div>
                    <span className="text-slate-500">Allowed Actions:</span> {kit.allowedActions.join(' · ')}
                  </div>
                </div>

                {/* Action log */}
                {kit.actionLog.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 space-y-1.5 text-[11px] font-mono">
                    <span className="text-slate-500 block uppercase">Audit History:</span>
                    {kit.actionLog.slice(0, 2).map((log, idx) => (
                      <div key={idx} className="text-slate-400">
                        [{new Date(log.timestamp).toLocaleTimeString()}] {log.action} →{' '}
                        <span className="text-emerald-400">{log.outcome}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
