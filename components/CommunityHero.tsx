'use client';

import React from 'react';
import { translations } from '@/lib/i18n';
import { Community, Language } from '@/lib/types';
import { CommunityOutcomeAnalytics } from '@/lib/services/analytics';
import Image from 'next/image';
import { CheckCircle2, MessageSquare, ListTodo, Shield, Users, ExternalLink, Play } from 'lucide-react';

interface CommunityHeroProps {
  community: Community;
  analytics: CommunityOutcomeAnalytics;
  lang: Language;
  onOpenCreateRequest: () => void;
  onSelectTab: (tab: string) => void;
}

export const CommunityHero: React.FC<CommunityHeroProps> = ({
  community,
  analytics,
  lang,
  onOpenCreateRequest,
  onSelectTab
}) => {
  const t = translations[lang];

  return (
    <section className="border-b border-slate-800 bg-gradient-to-b from-slate-900/60 to-transparent pb-8 pt-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Community Info Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
              <Image
                src={community.avatar}
                alt={community.name}
                fill
                sizes="56px"
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {community.name}
                </h1>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-indigo-400 font-medium">
                  {community.category}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-300 max-w-2xl leading-relaxed">
                {community.description}
              </p>
              {/* Rules summary */}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                {community.rules.map((rule, idx) => (
                  <span key={idx} className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-slate-500" />
                    <span>{rule}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Connected Gateway Badges */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-center">
            {/* Discord */}
            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs">
              <span className="font-medium text-slate-300">Discord:</span>
              <span className={`font-mono text-[11px] ${community.discordConfig.connected ? 'text-emerald-400' : 'text-slate-500'}`}>
                {community.discordConfig.connected ? community.discordConfig.serverName || t.common.connected : t.common.notConfigured}
              </span>
            </div>

            {/* Telegram */}
            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs">
              <span className="font-medium text-slate-300">Telegram:</span>
              <span className={`font-mono text-[11px] ${community.telegramConfig.connected ? 'text-sky-400' : 'text-slate-500'}`}>
                {community.telegramConfig.connected ? community.telegramConfig.groupTitle || t.common.connected : t.common.notConfigured}
              </span>
            </div>
          </div>
        </div>

        {/* Real KPI Metric Strip — True Calculation with Tabular Numerals */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>{t.ownerAnalytics.requestsTotal}</span>
              <MessageSquare className="h-4 w-4 text-slate-500" />
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-white font-mono tabular-nums">
              {analytics.totalRequests}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              {analytics.requestsWithOffers} with offers
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>{t.ownerAnalytics.offersAccepted}</span>
              <CheckCircle2 className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-indigo-300 font-mono tabular-nums">
              {analytics.offersAccepted}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Avg {analytics.avgHoursToFirstOffer}h response
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>{t.ownerAnalytics.tasksCompleted}</span>
              <ListTodo className="h-4 w-4 text-sky-400" />
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-white font-mono tabular-nums">
              {analytics.tasksCompleted}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Of {analytics.tasksAssigned} assigned
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>{t.ownerAnalytics.verifiedOutcomes}</span>
              <Shield className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-400 font-mono tabular-nums">
              {analytics.verifiedOutcomes}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Dual signoff verified
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>{t.ownerAnalytics.activeParticipants}</span>
              <Users className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-white font-mono tabular-nums">
              {analytics.uniqueContributors}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              {analytics.firstMeaningfulActionsCount} first-action members
            </div>
          </div>
        </div>

        {/* Quick Launch Buttons */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenCreateRequest}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            <Play className="h-3.5 w-3.5" />
            <span>{t.needSignal.newRequest}</span>
          </button>
          <button
            onClick={() => onSelectTab('tasks')}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <ListTodo className="h-3.5 w-3.5" />
            <span>{t.navigation.tasks}</span>
          </button>
          <button
            onClick={() => onSelectTab('links')}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>{t.navigation.links}</span>
          </button>
          <button
            onClick={() => onSelectTab('tests')}
            className="flex items-center gap-2 rounded-lg border border-amber-600/40 bg-amber-950/20 px-4 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-900/40 transition-colors"
          >
            <Shield className="h-3.5 w-3.5 text-amber-400" />
            <span>{t.navigation.testSuite}</span>
          </button>
        </div>
      </div>
    </section>
  );
};
