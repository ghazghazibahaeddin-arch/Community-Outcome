'use client';

import React, { useState } from 'react';
import {
  PlanEntitlements,
  CommunitySubscription,
  Language,
  Community
} from '@/lib/types';
import {
  ShieldCheck,
  Check,
  Sparkles,
  Users,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  Share2,
  Copy,
  CheckCircle2,
  Clock,
  CreditCard,
  RefreshCw,
  Shield
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
  onOpenCreateCommunity?: () => void;
  onOpenPrivacy?: () => void;
}

export const PricingPlansSection: React.FC<PricingPlansSectionProps> = ({
  community,
  subscription,
  entitlements,
  isOwner,
  lang,
  onRefresh,
  onOpenCreateCommunity,
  onOpenPrivacy
}) => {
  const isRtl = lang === 'ar';
  const isPro = subscription?.tier === 'pro' && subscription?.status === 'active';
  const checkoutUrl = `${WHOP_PRO_CHECKOUT_URL}?custom_community_id=${encodeURIComponent(community.id)}`;

  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'plans' | 'growth'>('plans');
  const [isVerifyingBilling, setIsVerifyingBilling] = useState(false);
  const [billingStatusNote, setBillingStatusNote] = useState<string | null>(null);

  const membersUsed = entitlements?.currentUsage?.membersCount ?? 0;
  const membersMax = entitlements?.maxMonthlyActiveMembers ?? (isPro ? 1000 : 100);
  const discordUsed = entitlements?.currentUsage?.discordServersCount ?? (community.discordConfig?.connected ? 1 : 0);
  const discordMax = entitlements?.maxDiscordServers ?? (isPro ? 5 : 1);
  const telegramUsed = entitlements?.currentUsage?.telegramGroupsCount ?? (community.telegramConfig?.connected ? 1 : 0);
  const telegramMax = entitlements?.maxTelegramGroups ?? (isPro ? 5 : 1);

  const handleCopyInvite = async () => {
    if (typeof window !== 'undefined') {
      const inviteUrl = `${window.location.origin}/?ref=comm_${community.slug}&communityId=${community.id}`;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(inviteUrl);
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 2500);
        }
      } catch {
        setBillingStatusNote(`Share link: ${inviteUrl}`);
      }
    }
  };

  const handleVerifyBillingStatus = async () => {
    setIsVerifyingBilling(true);
    setBillingStatusNote(null);
    try {
      const res = await fetch(`/api/billing/subscription?communityId=${encodeURIComponent(community.id)}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success && data.subscription) {
        const tierLabel = data.subscription.tier === 'pro' ? 'Community Pro ($15/mo)' : 'Free Starter ($0)';
        setBillingStatusNote(
          isRtl
            ? `تم التحقق من حالة الدفع لـ ${community.name}: الخطة الحالية ${tierLabel} (${data.subscription.status}).`
            : `Verified live billing state for ${community.name}: ${tierLabel} (${data.subscription.status}).`
        );
        onRefresh?.();
      } else {
        setBillingStatusNote(data.error || 'Could not verify subscription status.');
      }
    } catch (err: any) {
      setBillingStatusNote(err?.message || 'Network error checking billing status.');
    } finally {
      setIsVerifyingBilling(false);
    }
  };

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>{isRtl ? 'نموذج التسعير والنمو' : 'Monetization & Billing Timing'}</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400 font-medium">
                {isRtl ? 'الأعضاء مجاناً دائماً ($0) · المالك فقط يدفع عند التوسع' : 'Members Always Free ($0) · Only Owners Pay When Scaling'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {isRtl ? 'خطة مجانية للانطلاق + خطة Pro واحدة ($15/شهر) — متى وأين تدفع؟' : 'Plans, Limits & Exact Billing Timing ($0 Free / $15 Pro)'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isRtl
                ? 'ابدأ مجاناً بدون بطاقة ائتمان. الدفع مطلوب فقط عند توسيع مجتمعك لأكثر من 100 عضو، أو ربط أكثر من خادم ديسكورد/مجموعة تيلغرام، أو إنشاء مجتمع إضافي.'
                : 'Start completely free with zero credit card required. Payment applies only when scaling beyond 100 active members, linking multiple Discord servers or Telegram groups, or unlocking Pro automations.'}
            </p>
          </div>

          {/* Current Community Status & Live Refresh */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-4 shrink-0 text-center space-y-2 sm:min-w-[230px]">
            <span className="text-[11px] font-mono text-slate-400 block">
              {isRtl ? `حالة خطة: ${community.name}` : `Active Plan · ${community.name}`}
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
            <div className="text-[11px] font-mono text-slate-400 tabular-nums">
              {isPro
                ? `Active · Renews ${subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'Monthly'}`
                : '100 Members · 1 Server · 1 Group'}
            </div>
            <button
              type="button"
              onClick={handleVerifyBillingStatus}
              disabled={isVerifyingBilling}
              className="w-full min-h-[36px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isVerifyingBilling ? 'animate-spin' : ''}`} />
              <span>{isRtl ? 'تحديث حالة الاشتراك' : 'Refresh Billing Status'}</span>
            </button>
          </div>
        </div>

        {billingStatusNote && (
          <div className="mt-4 rounded-lg border border-indigo-500/30 bg-indigo-950/30 px-3.5 py-2.5 text-xs text-indigo-200">
            {billingStatusNote}
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-slate-800/80 mt-5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('plans')}
              className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'plans'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              {isRtl ? 'توقيت الدفع ومقارنة الخطط' : 'Billing Timing & Plans'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('growth')}
              className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'growth'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>{isRtl ? 'محرك النمو وروابط الإحالة' : 'Viral Growth & Referrals'}</span>
            </button>
          </div>

          {onOpenPrivacy && (
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="text-xs font-medium text-slate-400 hover:text-indigo-300 underline-offset-4 hover:underline"
            >
              {isRtl ? 'سياسة الدفع والإلغاء والخصوصية' : 'View Payment & Privacy Policy'}
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: BILLING TIMING, PLACEMENT & PLANS */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          {/* WHEN & WHERE PAYMENT HAPPENS */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-indigo-400" />
                  <span>{isRtl ? 'متى وأين يتم الدفع بالضبط؟' : 'When & Where Payment Happens'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isRtl
                    ? 'شفافية كاملة لوقت فرض الرسوم ومكان إتمام الدفع الآمن.'
                    : 'Clear billing triggers and checkout destination for community owners and members.'}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <CreditCard className="h-4 w-4 text-emerald-400" />
                <span>{isRtl ? 'بوابة الدفع الرسمية: Whop Checkout' : 'Processor: Official Whop Checkout'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1.5 border-t border-slate-800 pt-3">
                <span className="font-mono text-emerald-400 font-semibold">01 · {isRtl ? 'عند التسجيل' : 'At Signup'}</span>
                <div className="font-bold text-white">{isRtl ? 'مجاني بالكامل ($0)' : 'Always $0 Free'}</div>
                <p className="text-slate-400 leading-relaxed">
                  {isRtl
                    ? 'لا يُطلب الدفع عند إنشاء حساب عضو أو مالك أو ربط أول مجتمع وأول بوت.'
                    : 'Zero payment required to sign up, join groups, or launch 1 community with 1 Discord & 1 Telegram bot.'}
                </p>
              </div>

              <div className="space-y-1.5 border-t border-slate-800 pt-3">
                <span className="font-mono text-indigo-400 font-semibold">02 · {isRtl ? 'للأعضاء' : 'For Members'}</span>
                <div className="font-bold text-white">{isRtl ? 'مجاني للأبد ($0)' : 'Free Forever ($0)'}</div>
                <p className="text-slate-400 leading-relaxed">
                  {isRtl
                    ? 'الأعضاء لا يدفعون أي رسوم للانضمام، قبول المهام، أو توثيق جواز المهارات.'
                    : 'Members never pay subscription fees to participate, complete tasks, or keep their verified Passport.'}
                </p>
              </div>

              <div className="space-y-1.5 border-t border-slate-800 pt-3">
                <span className="font-mono text-amber-400 font-semibold">03 · {isRtl ? 'متى يدفع المالك؟' : 'When Owners Pay'}</span>
                <div className="font-bold text-white">{isRtl ? 'فقط عند التوسع ($15/شهر)' : 'Only Upon Scaling ($15/mo)'}</div>
                <p className="text-slate-400 leading-relaxed">
                  {isRtl
                    ? 'عند تجاوز 100 عضو، أو ربط خادم ديسكورد/مجموعة تيلغرام ثانية، أو إنشاء مجتمع ثانٍ.'
                    : 'Triggered only when crossing 100 members, adding a 2nd Discord server / Telegram group, or creating a 2nd community.'}
                </p>
              </div>

              <div className="space-y-1.5 border-t border-slate-800 pt-3">
                <span className="font-mono text-sky-400 font-semibold">04 · {isRtl ? 'أين يتم الدفع؟' : 'Where You Pay'}</span>
                <div className="font-bold text-white">{isRtl ? 'بوابة Whop الآمنة' : 'Whop Checkout + Instant Sync'}</div>
                <p className="text-slate-400 leading-relaxed">
                  {isRtl
                    ? 'من هذه الصفحة عبر Whop المرتبط بمعرف مجتمعك، ويتم التفعيل التلقائي فورياً عبر Webhook.'
                    : 'Direct Whop Checkout bound to your Community ID with automatic webhook activation and self-serve cancellation.'}
                </p>
              </div>
            </div>

            {/* Live Community Quota Usage Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-800 pt-4 text-xs">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{isRtl ? 'الأعضاء النشطون' : 'Monthly Active Members'}</span>
                  <span className="font-mono font-bold text-white tabular-nums">{membersUsed} / {membersMax}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${Math.min(100, Math.round((membersUsed / Math.max(1, membersMax)) * 100))}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{isRtl ? 'خوادم ديسكورد المربوطة' : 'Discord Servers Linked'}</span>
                  <span className="font-mono font-bold text-white tabular-nums">{discordUsed} / {discordMax}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-[#5865F2] rounded-full"
                    style={{ width: `${Math.min(100, Math.round((discordUsed / Math.max(1, discordMax)) * 100))}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{isRtl ? 'مجموعات تيلغرام المربوطة' : 'Telegram Groups Linked'}</span>
                  <span className="font-mono font-bold text-white tabular-nums">{telegramUsed} / {telegramMax}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-[#229ED9] rounded-full"
                    style={{ width: `${Math.min(100, Math.round((telegramUsed / Math.max(1, telegramMax)) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* PLAN COMPARISON CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* FREE PLAN CARD */}
            <div
              className={`rounded-2xl border p-6 space-y-6 flex flex-col justify-between transition-colors ${
                !isPro
                  ? 'border-emerald-500/40 bg-slate-900/50'
                  : 'border-slate-800 bg-slate-900/30'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-white">Free Starter</h3>
                    <p className="text-xs text-slate-400">
                      {isRtl ? 'للأعضاء وكل صاحب مجموعة يبدأ مشروعه' : 'For all members & early-stage communities'}
                    </p>
                  </div>
                  {!isPro && (
                    <span className="text-xs font-mono text-emerald-400 font-semibold shrink-0">
                      {isRtl ? 'نشط الآن' : 'Active Plan'}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white tabular-nums">$0</span>
                  <span className="text-xs text-slate-400">/ {isRtl ? 'شهرياً' : 'month'}</span>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>1 Community</strong> workspace</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>1 Discord server</strong> &amp; <strong>1 Telegram group</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Up to <strong>100 monthly active members</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Full Member Space &amp; Owner Workspace access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>NeedSignal, Match &amp; Offer, Poll2Plan, QuestLoop</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Contribution Ledger &amp; Shareable Passports</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  type="button"
                  disabled
                  className="w-full min-h-[42px] rounded-lg border border-slate-800 bg-slate-950 text-xs font-semibold text-slate-400 cursor-default"
                >
                  {!isPro
                    ? isRtl ? 'الخطة المجانية مفعلة تلقائياً' : 'Included by Default ($0)'
                    : isRtl ? 'تعود لهذه الخطة تلقائياً عند الإلغاء' : 'Reverts to Free if Cancelled'}
                </button>
              </div>
            </div>

            {/* COMMUNITY PRO CARD ($15/mo) */}
            <div
              className={`rounded-2xl border p-6 space-y-6 flex flex-col justify-between transition-colors ${
                isPro
                  ? 'border-amber-500/50 bg-slate-900/60'
                  : 'border-indigo-500/50 bg-slate-900/60'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-amber-400" />
                      <span>Community Pro</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      {isRtl ? 'للمجتمعات النامية والأتمتة المتقدمة' : 'For scaling communities & multi-server governance'}
                    </p>
                  </div>
                  <span className="text-xs font-mono text-amber-300 font-semibold shrink-0">
                    {isPro ? (isRtl ? 'مشترك Pro' : 'Active Pro') : 'Pro Tier'}
                  </span>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white tabular-nums">${PRO_PLAN_PRICE_USD}</span>
                  <span className="text-xs text-slate-400">/ {isRtl ? 'شهرياً لكل مجتمع' : 'month per community'}</span>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-200">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span>Up to <strong>1,000 monthly active members</strong> (10x capacity)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span>Up to <strong>5 Discord servers</strong> &amp; <strong>5 Telegram groups</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span>Create &amp; govern <strong>multiple communities</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span><strong>Advanced automations</strong> &amp; scheduled bot publishing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span><strong>Advanced analytics</strong>, TrustGraph &amp; Community Shield</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span><strong>Custom branding</strong>, API exports &amp; immutable audit logs</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
                {!isOwner ? (
                  <div className="space-y-2.5">
                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300 flex items-start gap-2">
                      <Shield className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        {isRtl
                          ? `أنت تتصفح حالياً كعضو في "${community.name}". الأعضاء لا يدفعون شيئاً أبداً. إذا أردت إنشاء مجتمعك الخاص يمكنك البدء مجاناً.`
                          : `You are viewing "${community.name}" as a Member. Members never pay. Want to run your own group? Launch 1 community free.`}
                      </span>
                    </div>
                    {onOpenCreateCommunity && (
                      <button
                        type="button"
                        onClick={onOpenCreateCommunity}
                        className="w-full min-h-[42px] rounded-lg bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-500 transition-colors"
                      >
                        {isRtl ? '+ أنشئ مجتمعك الخاص مجاناً ($0)' : '+ Create Your Own Community Free ($0)'}
                      </button>
                    )}
                  </div>
                ) : isPro ? (
                  <div className="space-y-2">
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-center text-xs text-amber-300 font-mono">
                      ✓ Community Pro ($15/mo) is active for {community.name}
                    </div>
                    <a
                      href="https://whop.com/hub"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full min-h-[42px] flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200 hover:text-white transition-colors"
                    >
                      <span>{isRtl ? 'إدارة الاشتراك في Whop' : 'Manage Subscription in Whop'}</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <a
                      href={checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-colors text-center"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>{isRtl ? 'الترقية الآن عبر Whop — $15/شهر' : 'Pay via Whop Checkout — $15/month'}</span>
                      <ArrowRight className="h-4 w-4" />
                    </a>
                    <p className="text-[11px] text-center text-slate-400">
                      {isRtl
                        ? 'دفع آمن عبر Whop · إلغاء في أي وقت · تفعيل فوري تلقائي'
                        : 'Official Whop Checkout · Cancel anytime · Instant automated activation'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VIRAL GROWTH & REFERRAL LINKS */}
      {activeTab === 'growth' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Share2 className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Community Referral Links</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Track referral clicks and member conversions across Discord and Telegram communities.
              </p>
              <div className="pt-2">
                <button
                  type="button"
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
        </div>
      )}
    </div>
  );
};
