'use client';

import React, { useState } from 'react';
import { Language, User } from '@/lib/types';
import {
  ShieldCheck,
  Users,
  Bot,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  Layers,
  KeyRound,
  MessageSquare,
  Globe,
  Compass,
  AlertCircle,
  Send
} from 'lucide-react';

interface OnboardingChoiceModalProps {
  isOpen: boolean;
  user: User | null;
  lang: Language;
  onSelectRole: (role: 'owner' | 'member', details?: { communityName?: string; inviteCode?: string }) => void | Promise<void>;
  onClose: () => void;
}

export const OnboardingChoiceModal: React.FC<OnboardingChoiceModalProps> = ({
  isOpen,
  user,
  lang,
  onSelectRole,
  onClose
}) => {
  const isRtl = lang === 'ar';
  const [selectedPath, setSelectedPath] = useState<'owner' | 'member' | null>(null);
  const [communityName, setCommunityName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProceed = async () => {
    setError(null);
    if (!selectedPath) {
      setError(isRtl ? 'يرجى اختيار مسارك للبدء' : 'Please choose your primary path to get started.');
      return;
    }

    if (selectedPath === 'owner' && !communityName.trim()) {
      setError(isRtl ? 'يرجى إدخال اسم مجتمعك' : 'Please provide a name for your community.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSelectRole(selectedPath, {
        communityName: communityName.trim() || undefined,
        inviteCode: inviteCode.trim() || undefined
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || (isRtl ? 'حدث خطأ أثناء الإعداد' : 'Setup failed. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl shadow-indigo-950/40 my-8">
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{isRtl ? 'مرحباً بك في Community OS' : 'Welcome to Community OS'}</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {isRtl ? 'اختر مسار انضمامك إلى المنظومة' : 'Choose Your Onboarding Path'}
          </h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            {isRtl
              ? 'تحدد هذه الخطوة مساحة العمل الافتراضية وصلاحياتك. يتم فصل صلاحيات المالكين عن الأعضاء بدقة متناهية.'
              : 'Select how you intend to engage with Community OS. Workspaces and permissions are strictly isolated.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Option A: Community Owner */}
          <div
            onClick={() => setSelectedPath('owner')}
            className={`cursor-pointer rounded-xl border p-5 transition-all text-left relative flex flex-col justify-between ${
              selectedPath === 'owner'
                ? 'border-indigo-500 bg-indigo-950/20 shadow-lg shadow-indigo-900/30 ring-1 ring-indigo-500'
                : 'border-slate-800 bg-slate-950 hover:border-slate-700'
            }`}
          >
            {selectedPath === 'owner' && (
              <div className="absolute top-3 right-3 text-indigo-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            )}
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-1">
                  {isRtl ? 'أنا مالك / مدير مجتمع' : 'I am a Community Owner'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isRtl
                    ? 'إدارة مجتمع، ربط خادم Discord ومجموعة Telegram، وتعيين المشرفين.'
                    : 'Create and govern communities, install bots on Discord/Telegram, and lead initiatives.'}
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-2 text-[11px] text-slate-300">
                  <Bot className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span>{isRtl ? 'ربط خوادم Discord ومجموعات Telegram' : 'Connect Discord servers & Telegram groups'}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-300">
                  <Layers className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span>{isRtl ? 'إدارة لوحات NeedSignal وQuestLoop' : 'Govern NeedSignal & QuestLoop workflows'}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-300">
                  <Lock className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span>{isRtl ? 'تحقق إلزامي من صلاحيات المشرف الحقيقية' : 'Verified server administrator permissions check'}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 text-[11px] font-mono text-indigo-300 flex items-center gap-1">
              <span>{isRtl ? 'تفعيل مساحة المالك' : 'Access Owner Workspace'}</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </div>

          {/* Option B: Community Member */}
          <div
            onClick={() => setSelectedPath('member')}
            className={`cursor-pointer rounded-xl border p-5 transition-all text-left relative flex flex-col justify-between ${
              selectedPath === 'member'
                ? 'border-violet-500 bg-violet-950/20 shadow-lg shadow-violet-900/30 ring-1 ring-violet-500'
                : 'border-slate-800 bg-slate-950 hover:border-slate-700'
            }`}
          >
            {selectedPath === 'member' && (
              <div className="absolute top-3 right-3 text-violet-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            )}
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-1">
                  {isRtl ? 'أنا عضو مساهم في المجتمع' : 'I am a Community Member'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isRtl
                    ? 'المساهمة في المهام، تقديم عروض الدعم، وبناء جواز السفر المهني المعتمد.'
                    : 'Contribute to deliverables, respond to help requests, and build your verified outcome portfolio.'}
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-2 text-[11px] text-slate-300">
                  <Compass className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                  <span>{isRtl ? 'ربط الحسابات الشخصية (Discord وTelegram)' : 'Link personal Discord & Telegram passports'}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-300">
                  <Sparkles className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                  <span>{isRtl ? 'تقديم عروض الدعم واستلام المهام' : 'Submit offers & complete assigned deliverables'}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-300">
                  <ShieldCheck className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                  <span>{isRtl ? 'جواز سفر معتمد بالمهام ومراجعة الأقران' : 'Cryptographic peer-reviewed SourceTrail ledger'}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 text-[11px] font-mono text-violet-300 flex items-center gap-1">
              <span>{isRtl ? 'تفعيل مساحة العضو' : 'Access Member Space'}</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        </div>

        {/* Dynamic Context Fields */}
        {selectedPath === 'owner' && (
          <div className="mb-6 rounded-xl border border-indigo-500/20 bg-slate-950 p-4 space-y-3">
            <label className="block text-xs font-semibold text-slate-200">
              {isRtl ? 'اسم المجتمع الرئيسي الذي تريد إنشاؤه أو إدارته' : 'Primary Community Name to Create / Manage'}
            </label>
            <input
              type="text"
              value={communityName}
              onChange={(e) => setCommunityName(e.target.value)}
              placeholder="e.g. AI Builders Collective, DevForge, Cairo Web3"
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-400">
              {isRtl
                ? 'ستتمكن لاحقاً من ربط خادم Discord أو مجموعة Telegram الخاصة بهذا المجتمع عبر مركز التكاملات.'
                : 'You will immediately be guided through the official Discord server and Telegram group linking flows.'}
            </p>
          </div>
        )}

        {selectedPath === 'member' && (
          <div className="mb-6 rounded-xl border border-violet-500/20 bg-slate-950 p-4 space-y-3">
            <label className="block text-xs font-semibold text-slate-200">
              {isRtl ? 'رمز دعوة المجتمع (اختياري)' : 'Community Invite Code (Optional)'}
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="e.g. DEVFORGE-2026 or INV-9821"
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <p className="text-[11px] text-slate-400">
              {isRtl
                ? 'إذا لم يكن لديك رمز، ستتمكن من استكشاف المجتمعات العامة والبدء فوراً.'
                : 'If you do not have an invite code, you can discover open communities from your Member Space.'}
            </p>
          </div>
        )}

        {/* Direct Personal Account Linking (Discord & Telegram) */}
        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-950/90 p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-white">
              {isRtl ? 'ربط حساباتك الشخصية مباشرة (Discord & Telegram)' : 'Link Your Personal Discord & Telegram Accounts'}
            </span>
            <span className="text-[10px] font-mono text-slate-400">OAuth / OIDC</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {user?.identities?.discordId ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Discord: @{user.identities.discordUsername || 'Connected'}</span>
              </span>
            ) : (
              <a
                href="/api/discord/connect?mode=user&redirect=true"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#5865F2]/50 bg-[#5865F2]/15 hover:bg-[#5865F2]/25 px-3 py-1.5 text-xs font-semibold text-[#9aa8ff] transition-all"
              >
                <Bot className="h-3.5 w-3.5" />
                <span>{isRtl ? 'ربط Discord الآن' : 'Link Discord Account'}</span>
              </a>
            )}

            {user?.identities?.telegramId ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Telegram: @{user.identities.telegramUsername || 'Connected'}</span>
              </span>
            ) : (
              <a
                href="/api/auth/telegram/authorize?redirect=true"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#229ED9]/50 bg-[#229ED9]/15 hover:bg-[#229ED9]/25 px-3 py-1.5 text-xs font-semibold text-[#5dc5f7] transition-all"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isRtl ? 'ربط Telegram الآن' : 'Link Telegram Account'}</span>
              </a>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            {isRtl ? 'تخطي للآن' : 'Decide Later'}
          </button>
          <button
            type="button"
            onClick={handleProceed}
            disabled={!selectedPath || isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>{isRtl ? 'جاري التجهيز...' : 'Configuring...'}</span>
            ) : (
              <>
                <span>{isRtl ? 'المتابعة إلى مساحة العمل' : 'Continue to Workspace'}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
