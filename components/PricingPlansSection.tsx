'use client';

import React, { useState } from 'react';
import {
  PlanTier,
  PlanEntitlements,
  CommunitySubscription,
  Language,
  Community
} from '@/lib/types';
import {
  ShieldCheck,
  Check,
  Sparkles,
  Zap,
  Bot,
  Users,
  Shield,
  Layers,
  ExternalLink,
  Lock,
  ArrowRight,
  TrendingUp,
  Share2,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { WHOP_PRO_CHECKOUT_URL, PRO_PLAN_PRICE_USD } from '@/lib/plans';

interface PricingPlansSectionProps {
  community: Community;
  subscription?: CommunitySubscription;
  entitlements?: PlanEntitlements & {
    currentUsage: {
      membersCount: number;
      discordServersCount: number;
      telegramGroupsCount: number;
    };
  };
  isOwner: boolean;
  lang: Language;
  onRefresh?: () => void;
}

export const PricingPlansSection: React.FC<PricingPlansSectionProps> = ({
  community,
  subscription,
  entitlements,
  isOwner,
  lang,
  onRefresh
}) => {
  const isRtl = lang === 'ar';
  const isPro = subscription?.tier === 'pro' && subscription?.status === 'active';
  const checkoutUrl = `${WHOP_PRO_CHECKOUT_URL}?custom_community_id=${encodeURIComponent(community.id)}`;

  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'plans' | 'growth'>('plans');

  const handleCopyInvite = () => {
    if (typeof window !== 'undefined') {
      const inviteUrl = `${window.location.origin}/?ref=comm_${community.slug}&communityId=${community.id}`;
      navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-indigo-950/20 to-slate-900/90 p-6 sm:p-8 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[11px] font-mono text-indigo-400 border border-indigo-500/20">
                {isRtl ? 'نموذج التسعير والنمو' : 'Monetization & Viral Growth Model'}
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-xs font-mono text-slate-400">
                {isRtl ? 'الأعضاء مجاناً دائماً · فقط المالكون يدفعون' : 'All Members Free Forever · Only Community Owners Pay'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {isRtl ? 'خطة واحدة مجانية + خطة احترافية واحدة' : 'One Free Plan + One Pro Plan ($15/mo)'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isRtl
                ? 'حافظ على استمرارية ونمو مجتمعك بدون حواجز اشتراك للأعضاء. ابنِ المخرجات، وثّق الإنجازات، واستفد من روابط الإحالة والانتشار الفيروسي.'
                : 'Zero barriers for member participation. Unlock multi-server Discord/Telegram bot capacity, advanced automated workflows, and audit capabilities for your community.'}
            </p>
          </div>

          {/* Current Community Status Badge */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 shrink-0 text-center space-y-1 sm:min-w-[200px]">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              {isRtl ? 'خطة المجتمع الحالية' : 'Current Community Tier'}
            </span>
            <div className="flex items-center justify-center gap-1.5">
              {isPro ? (
                <>
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span className="text-base font-bold text-amber-300">Community Pro</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span className="text-base font-bold text-emerald-300">Free Starter</span>
                </>
              )}
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              {isPro
                ? `Active · Renews ${subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'Monthly'}`
                : '100 Members · 1 Server · 1 Group'}
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 pt-6 border-t border-slate-800/80 mt-6">
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'plans'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            {isRtl ? 'مقارنة الخطط والترقية' : 'Plans & Upgrades'}
          </button>
          <button
            onClick={() => setActiveTab('growth')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'growth'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>{isRtl ? 'محرك النمو الفيروسي وروابط الإحالة' : 'Viral Growth Engine & Referrals'}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: PLANS & UPGRADE */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* FREE PLAN CARD */}
          <div
            className={`rounded-2xl border p-6 space-y-6 flex flex-col justify-between transition-all ${
              !isPro
                ? 'border-emerald-500/40 bg-slate-900/50 shadow-xl shadow-emerald-950/20'
                : 'border-slate-800 bg-slate-900/20'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Free Starter</h3>
                  <p className="text-xs text-slate-400">Everything needed to launch and run an outcome-driven community.</p>
                </div>
                {!isPro && (
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-[10px] font-mono text-emerald-400">
                    Active Plan
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">$0</span>
                <span className="text-xs text-slate-400">/ {isRtl ? 'شهرياً' : 'month'}</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>1 Community</strong> workspace</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>1 Discord server</strong> & <strong>1 Telegram group</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Up to <strong>100 monthly active members</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Full Member Space & Owner Workspace access</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>NeedSignal, Match & Offer, Poll2Plan, QuestLoop</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Contribution Ledger & Basic TrustGraph</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Shareable Passports & public verified outcome pages</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Powered by Community OS attribution badge</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <button
                disabled
                className="w-full py-2.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-400 cursor-default"
              >
                {!isPro ? 'Included by Default' : 'Downgrades to Free if Cancelled'}
              </button>
            </div>
          </div>

          {/* COMMUNITY PRO CARD ($15/mo) */}
          <div
            className={`rounded-2xl border p-6 space-y-6 flex flex-col justify-between relative overflow-hidden transition-all ${
              isPro
                ? 'border-amber-500/50 bg-gradient-to-b from-amber-950/20 to-slate-900/60 shadow-xl shadow-amber-950/30'
                : 'border-indigo-500/50 bg-gradient-to-b from-indigo-950/30 to-slate-900/60 shadow-2xl shadow-indigo-950/40'
            }`}
          >
            {/* Pro badge */}
            <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-500 to-amber-500 text-slate-950 px-3 py-1 rounded-bl-xl text-[10px] font-extrabold uppercase tracking-wider font-mono">
              Pro Tier
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>Community Pro</span>
                </h3>
                <p className="text-xs text-slate-400">Scale your community with high capacity, automation & auditability.</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">${PRO_PLAN_PRICE_USD}</span>
                <span className="text-xs text-slate-400">/ {isRtl ? 'شهرياً لكل مجتمع' : 'month per community'}</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-200">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>Up to <strong>1,000 monthly active members</strong> (10x capacity)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>Up to <strong>5 Discord servers</strong> & <strong>5 Telegram groups</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span><strong>Advanced automations</strong> & scheduled bot publishing</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span><strong>Advanced analytics</strong> & outcome export reports</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span><strong>Advanced TrustGraph</strong> & Community Shield enforcement</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span><strong>Custom branding</strong> (removes attribution badges)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span><strong>API, Webhooks, data exports</strong> & immutable audit logs</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>Advanced multi-role permissions & review workflows</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-slate-800/80 space-y-2">
              {isPro ? (
                <div className="space-y-2">
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-center text-xs text-amber-300 font-mono">
                    ✓ Your community is currently on Community Pro ($15/mo)
                  </div>
                  <a
                    href="https://whop.com/hub"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                  >
                    <span>Manage Subscription in Whop</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : (
                <div className="space-y-2">
                  <a
                    href={checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-xs font-bold text-white shadow-xl shadow-indigo-600/30 transition-all text-center"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>{isRtl ? 'ترقية المجتمع إلى Pro ($15/شهر)' : 'Upgrade to Community Pro — $15/month'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <p className="text-[10px] text-center text-slate-400 font-mono">
                    Official Whop Checkout · Cancel anytime · Instant automated webhook activation
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VIRAL GROWTH & REFERRAL LINKS */}
      {activeTab === 'growth' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Shareable Passports */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
              <div className="h-9 w-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Users className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Shareable Member Passports</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every member has a public URL showcasing only verified peer-reviewed skills and contributions.
              </p>
              <div className="pt-2">
                <a
                  href="/p/usr_sarah"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 font-mono"
                >
                  <span>Preview Public Passport</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* Public Outcome Records */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
              <div className="h-9 w-9 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Public Verified Outcomes</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Showcase deliverables and verified achievements to prospective partners, sponsors, and contributors.
              </p>
              <div className="pt-2">
                <a
                  href="/outcome/out_sec_audit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 font-mono"
                >
                  <span>Preview Public Outcome</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* Viral Referral Links */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Share2 className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Community Referral Links</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Track referral clicks and member conversions across Twitter, Discord, and Telegram communities.
              </p>
              <div className="pt-2">
                <button
                  onClick={handleCopyInvite}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  {copiedLink ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-mono">Copied Link!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Copy Referral Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Share Attribution Rule */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-400 space-y-1 font-mono">
            <span className="font-bold text-slate-300">Privacy & Attribution Guarantee:</span>
            <p>
              • Only approved public information and verified achievements are shared.
              <br />
              • Private member details, email addresses, and secret bot keys are never revealed.
              <br />
              • Free public pages include a non-intrusive &quot;Powered by Community OS&quot; badge to drive organic community growth.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
