'use client';

import React, { useState } from 'react';
import { Community, Language, User } from '@/lib/types';
import {
  Monitor,
  Smartphone,
  Bot,
  Send,
  Copy,
  Check,
  ExternalLink,
  Key,
  ShieldCheck,
  LayoutGrid,
  Compass,
  QrCode,
  Laptop,
  TabletSmartphone
} from 'lucide-react';

export type DeviceExperienceMode = 'auto' | 'desktop' | 'mobile';

interface DeviceAccessCenterProps {
  currentUser: User;
  community: Community | null;
  lang: Language;
  deviceMode: DeviceExperienceMode;
  onChangeDeviceMode: (mode: DeviceExperienceMode) => void;
  onNavigateWorkspace: (mode: 'owner' | 'member' | 'modules', subTab?: string) => void;
  onRefresh: () => void;
}

export const DeviceAccessCenter: React.FC<DeviceAccessCenterProps> = ({
  currentUser,
  community,
  lang,
  deviceMode,
  onChangeDeviceMode,
  onNavigateWorkspace,
  onRefresh
}) => {
  const isRtl = lang === 'ar';
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [quickCode, setQuickCode] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [copiedQuickCode, setCopiedQuickCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const hubUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?communityId=${encodeURIComponent(community?.id || 'comm_devforge')}`
      : 'https://community-outcome.ghazghazibahaeddin.workers.dev';

  const copyWorkspaceUrl = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(hubUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2200);
      }
    } catch {}
  };

  const handleGenerateMobileCode = async (platform: 'telegram' | 'discord') => {
    setIsGeneratingCode(true);
    setCodeError(null);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'create_identity_challenge',
          payload: { userId: currentUser.id, platform }
        })
      });
      const data = await res.json();
      const code = (data.result || data.item)?.code;
      if (!res.ok || !data.success || !code) {
        setCodeError(data.error || 'Could not generate quick link code.');
        return;
      }
      setQuickCode(code);
      onRefresh();
    } catch (err: any) {
      setCodeError(err?.message || 'Failed to generate code.');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const copyCode = async () => {
    if (!quickCode) return;
    try {
      await navigator.clipboard.writeText(`/connect ${quickCode}`);
      setCopiedQuickCode(true);
      setTimeout(() => setCopiedQuickCode(false), 2200);
    } catch {}
  };

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header & Layout Ergonomics Switch */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800 pb-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{isRtl ? 'تنظيم تجربة الأجهزة' : 'Cross-Device Experience'}</span>
            <span aria-hidden="true">·</span>
            <span>{isRtl ? 'لأصحاب الكمبيوتر (PC) ولأصحاب الهواتف (Mobile)' : 'Tailored for Desktop PC & Mobile Phones'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {isRtl ? 'مركز الوصول المنظم للكمبيوتر والهاتف' : 'PC & Mobile Access Center'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            {isRtl
              ? 'مساحة مخصصة ومرتبة تمنح أصحاب الكمبيوتر لوحة قيادة واسعة متعددة الأعمدة، وتمنح أصحاب الهواتف تنقلاً مريحاً بالإبهام مع ربط فوري بتطبيقات تيلغرام وديسكورد على الجوال.'
              : 'Dedicated, uncluttered workspaces: multi-column administration and bot setup for desktop PC users, plus thumb-zone navigation and 1-tap bot linking for mobile users.'}
          </p>
        </div>

        {/* Display Mode Switcher */}
        <div className="space-y-1.5 shrink-0">
          <span className="text-[11px] font-medium text-slate-400 block">
            {isRtl ? 'وضع عرض الواجهة الحالي' : 'Active Viewport Layout'}
          </span>
          <div className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 p-1">
            <button
              type="button"
              onClick={() => onChangeDeviceMode('auto')}
              className={`min-h-[40px] flex items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                deviceMode === 'auto'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>{isRtl ? 'تلقائي' : 'Auto'}</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeDeviceMode('desktop')}
              className={`min-h-[40px] flex items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                deviceMode === 'desktop'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
              <span>{isRtl ? 'وضع الكمبيوتر (PC)' : 'Desktop PC'}</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeDeviceMode('mobile')}
              className={`min-h-[40px] flex items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                deviceMode === 'mobile'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>{isRtl ? 'وضع الهاتف' : 'Mobile Touch'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Two Dedicated Side-by-Side Device Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        {/* ============================================================ */}
        {/* PANEL 1: FOR PC / DESKTOP USERS                              */}
        {/* ============================================================ */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-7 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400">
                  <Laptop className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] font-mono text-indigo-400 block">
                    {isRtl ? 'مساحة سطح المكتب والشاشات الكبيرة' : 'Windows · macOS · Linux Browsers'}
                  </span>
                  <h2 className="text-lg font-bold text-white">
                    {isRtl ? 'قسم أصحاب الكمبيوتر (PC Hub)' : 'For PC & Desktop Users'}
                  </h2>
                </div>
              </div>
              <span className="text-xs font-mono text-slate-400 tabular-nums">1280px+</span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isRtl
                ? 'مصمم لإدارة الخوادم والمجموعات بكفاءة عالية على الشاشات العريضة: فرز الطلبات، مراجعة الأدلة، إدارة الأعضاء والأدوار، وتصدير السجلات.'
                : 'Built for multi-column administration on wide screens: request triage, deliverable verification, role governance, Discord/Telegram bot setup, and audit exports.'}
            </p>

            {/* Structured PC Capabilities List (Hairline dividers, zero nested cards) */}
            <div className="divide-y divide-slate-800/80 border-y border-slate-800/80 text-xs">
              <div className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-white">
                    {isRtl ? '1. إدارة الجروب والخادم كاملة' : '1. Full Owner & Moderation Console'}
                  </div>
                  <div className="text-slate-400 mt-0.5">
                    {isRtl ? 'جدول الأعضاء، النزاعات، الدعوات، وإعدادات البوتات في شاشة واحدة.' : 'Member tables, dispute adjudication, invite codes, and live bot diagnostics side-by-side.'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateWorkspace('owner', 'operations')}
                  className="min-h-[40px] px-3 rounded-lg border border-slate-700 bg-slate-950 text-xs font-semibold text-slate-200 hover:text-white whitespace-nowrap shrink-0"
                >
                  {isRtl ? 'فتح الإدارة' : 'Open Console'}
                </button>
              </div>

              <div className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-white">
                    {isRtl ? '2. ربط تطبيق ديسكورد وتيلغرام على الكمبيوتر' : '2. Desktop Discord & Telegram Linking'}
                  </div>
                  <div className="text-slate-400 mt-0.5">
                    {isRtl ? 'مصادقة OAuth مباشرة مع تطبيق Discord Desktop أو Telegram Desktop.' : 'Direct OAuth browser handoff straight into Discord Desktop or Telegram Desktop.'}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href="https://discord.com/app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[40px] inline-flex items-center gap-1.5 px-3 rounded-lg border border-[#5865F2]/40 bg-[#5865F2]/10 text-xs font-semibold text-[#9aa8ff] hover:bg-[#5865F2]/20 whitespace-nowrap"
                  >
                    <Bot className="h-3.5 w-3.5" />
                    <span>Discord</span>
                  </a>
                  <a
                    href="https://t.me/CommunityOutcomeBot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[40px] inline-flex items-center gap-1.5 px-3 rounded-lg border border-[#229ED9]/40 bg-[#229ED9]/10 text-xs font-semibold text-[#5dc5f7] hover:bg-[#229ED9]/20 whitespace-nowrap"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Telegram</span>
                  </a>
                </div>
              </div>

              <div className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-white">
                    {isRtl ? '3. تثبيت كتطبيق ويب على الكمبيوتر' : '3. Pin as Desktop Web App'}
                  </div>
                  <div className="text-slate-400 mt-0.5">
                    {isRtl ? 'في Chrome / Edge اضغط أيقونة التثبيت في شريط العنوان للوصول السريع.' : 'In Chrome or Edge, click Install App in the address bar or copy your direct workspace URL.'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={copyWorkspaceUrl}
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-3 rounded-lg border border-slate-700 bg-slate-950 text-xs font-semibold text-slate-200 hover:text-white whitespace-nowrap shrink-0"
                >
                  {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedUrl ? (isRtl ? 'تم النسخ' : 'Copied') : (isRtl ? 'نسخ الرابط' : 'Copy Link')}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <span className="text-[11px] text-slate-400">
              {isRtl ? 'مناسب لـ: أصحاب المجموعات، المراجعين، والمشرفين' : 'Best for: Community Owners, Reviewers & Moderators'}
            </span>
            <button
              type="button"
              onClick={() => onChangeDeviceMode('desktop')}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-500 transition-colors whitespace-nowrap"
            >
              <Monitor className="h-4 w-4" />
              <span>{isRtl ? 'تفعيل عرض الكمبيوتر الآن' : 'Use Desktop Layout'}</span>
            </button>
          </div>
        </section>

        {/* ============================================================ */}
        {/* PANEL 2: FOR PHONE / MOBILE USERS                            */}
        {/* ============================================================ */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-7 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                  <TabletSmartphone className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] font-mono text-emerald-400 block">
                    {isRtl ? 'واجهة اللمس السريعة للهواتف' : 'iOS Safari · Android Chrome · In-App'}
                  </span>
                  <h2 className="text-lg font-bold text-white">
                    {isRtl ? 'قسم أصحاب الهواتف (Mobile Hub)' : 'For Phone & Mobile Users'}
                  </h2>
                </div>
              </div>
              <span className="text-xs font-mono text-slate-400 tabular-nums">375px–430px</span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isRtl
                ? 'واجهة مريحة للاستخدام بيد واحدة مع شريط تنقل سفلي واضح (أزرار 44px+)، وربط سريع ببوت تيلغرام وديسكورد على جوالك بدون كتابة معقدة.'
                : 'One-handed thumb navigation bar with 44px+ touch targets, mobile home-screen shortcut steps, and instant mobile bot linking codes.'}
            </p>

            {/* Structured Mobile Capabilities List */}
            <div className="divide-y divide-slate-800/80 border-y border-slate-800/80 text-xs">
              <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-white">
                    {isRtl ? '1. ربط سريع من الهاتف بكود /connect' : '1. 1-Tap Mobile Bot Link Code'}
                  </div>
                  <div className="text-slate-400 mt-0.5">
                    {isRtl ? 'ولّد كوداً فورياً والصقه في محادثة @CommunityOutcomeBot أو Discord.' : 'Generate a 15-min code and paste it directly inside Telegram or Discord mobile app.'}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={isGeneratingCode}
                    onClick={() => handleGenerateMobileCode('telegram')}
                    className="min-h-[44px] px-3 rounded-lg border border-[#229ED9]/40 bg-[#229ED9]/15 text-xs font-semibold text-[#5dc5f7] hover:bg-[#229ED9]/25 whitespace-nowrap disabled:opacity-50"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5" />
                      <span>{isRtl ? 'كود تيلغرام' : 'TG Code'}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={isGeneratingCode}
                    onClick={() => handleGenerateMobileCode('discord')}
                    className="min-h-[44px] px-3 rounded-lg border border-[#5865F2]/40 bg-[#5865F2]/15 text-xs font-semibold text-[#9aa8ff] hover:bg-[#5865F2]/25 whitespace-nowrap disabled:opacity-50"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5" />
                      <span>{isRtl ? 'كود ديسكورد' : 'DC Code'}</span>
                    </span>
                  </button>
                </div>
              </div>

              {quickCode && (
                <div className="py-3 flex items-center justify-between gap-3 bg-slate-950/60 px-3 rounded-lg">
                  <div className="font-mono text-sm font-bold text-emerald-300">
                    /connect {quickCode}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={copyCode}
                      className="min-h-[40px] inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-500"
                    >
                      {copiedQuickCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedQuickCode ? (isRtl ? 'تم النسخ' : 'Copied') : (isRtl ? 'نسخ الأمر' : 'Copy')}</span>
                    </button>
                    <a
                      href="https://t.me/CommunityOutcomeBot?start=connect"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[40px] inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs font-semibold text-slate-200 hover:text-white"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>{isRtl ? 'فتح البوت' : 'Open Bot'}</span>
                    </a>
                  </div>
                </div>
              )}

              {codeError && (
                <div className="py-2 text-xs text-rose-400">{codeError}</div>
              )}

              <div className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-white">
                    {isRtl ? '2. إضافة للشاشة الرئيسية (iPhone & Android)' : '2. Add to Phone Home Screen'}
                  </div>
                  <div className="text-slate-400 mt-0.5">
                    {isRtl
                      ? 'آيفون (Safari): زر المشاركة ← إضافة إلى الشاشة الرئيسية · أندرويد (Chrome): القائمة ⋮ ← تثبيت التطبيق.'
                      : 'iOS Safari: Share → Add to Home Screen · Android Chrome: Menu ⋮ → Add to Home Screen.'}
                  </div>
                </div>
                <QrCode className="h-5 w-5 text-slate-500 shrink-0" />
              </div>

              <div className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-white">
                    {isRtl ? '3. مساحة العضو السريعة على الهاتف' : '3. Mobile Member Tasks & Passport'}
                  </div>
                  <div className="text-slate-400 mt-0.5">
                    {isRtl ? 'إشعاراتك، مهامك الحالية، وجواز مهاراتك بأزرار لمس مريحة.' : 'Inbox alerts, task checklists, and verified passport cards built for quick taps.'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateWorkspace('member', 'inbox')}
                  className="min-h-[44px] px-3 rounded-lg border border-slate-700 bg-slate-950 text-xs font-semibold text-slate-200 hover:text-white whitespace-nowrap shrink-0"
                >
                  {isRtl ? 'مساحة العضو' : 'Member Space'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <span className="text-[11px] text-slate-400">
              {isRtl ? 'مناسب لـ: الأعضاء أثناء التنقل ومتابعة المهام اليومية' : 'Best for: Members on the go & daily task check-ins'}
            </span>
            <button
              type="button"
              onClick={() => onChangeDeviceMode('mobile')}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-500 transition-colors whitespace-nowrap"
            >
              <Smartphone className="h-4 w-4" />
              <span>{isRtl ? 'معاينة وتفعيل وضع الهاتف' : 'Preview Mobile Touch View'}</span>
            </button>
          </div>
        </section>
      </div>

      {/* Organized Feature Map (Where Every Feature Lives) */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Compass className="h-4 w-4 text-indigo-400" />
              <span>{isRtl ? 'خريطة تنظيم أماكن الميزات في المنصة' : 'Where Every Feature Lives (Platform Map)'}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isRtl ? 'دليل سريع للوصول إلى أي أداة دون بحث أو تداخل.' : 'Organized index of Owner, Member, Bot, Billing, and Policy sections.'}
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 tabular-nums">5 Core Zones</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="space-y-2 border-t border-slate-800 pt-3">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              <span>{isRtl ? 'مساحة صاحب الجروب (Owner)' : 'Owner Workspace'}</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              {isRtl
                ? 'الفرز والمراجعة، النزاعات، الأدوار والمشرفون، الإعلانات، أكواد الدعوة، وبوابات ديسكورد وتيلغرام المستقلة.'
                : 'Triage queue, contribution verification, disputes, staff roles, announcements, invite codes, and separate Discord & Telegram bot hubs.'}
            </p>
          </div>

          <div className="space-y-2 border-t border-slate-800 pt-3">
            <div className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Smartphone className="h-4 w-4" />
              <span>{isRtl ? 'مساحة العضو (Member Space)' : 'Member Space'}</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              {isRtl
                ? 'صندوق الوارد، الفرص المتاحة، المهام، الالتزامات، جواز المهارات المحمول، وبطاقتا ربط ديسكورد وتيلغرام.'
                : 'Personal inbox, opportunity feed, assigned tasks, commitments, portable Passport, and symmetric Discord/Telegram member cards.'}
            </p>
          </div>

          <div className="space-y-2 border-t border-slate-800 pt-3">
            <div className="font-bold text-emerald-300 flex items-center gap-1.5">
              <LayoutGrid className="h-4 w-4" />
              <span>{isRtl ? 'الأدوات، الدفع، والخصوصية' : 'Modules, Billing & Policies'}</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              {isRtl
                ? 'بوابة الوحدات (NeedSignal, QuestLoop, TrustGraph, Links, Knowledge)، توقيت ومكان الدفع ($0 للعضو / $15 للمالك Pro)، ومركز الخصوصية والسياسات.'
                : 'All Modules hub, transparent Billing Timing & Whop checkout, PC/Mobile device switcher, and Privacy & Governance Policies.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
