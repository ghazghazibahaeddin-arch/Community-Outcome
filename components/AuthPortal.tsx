'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Language, User } from '@/lib/types';
import {
  ShieldCheck,
  Shield,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  RefreshCw,
  Globe,
  Bot,
  Zap,
  Layers,
  Award,
  Send,
  Users,
  Crown
} from 'lucide-react';

interface AuthPortalProps {
  lang: Language;
  onToggleLang: () => void;
  onAuthenticated: (user: User, defaultWorkspace: 'owner' | 'member', isNewSignup?: boolean) => void;
  discordInstallUrl?: string;
  initialMode?: 'login' | 'signup';
}

export const AuthPortal: React.FC<AuthPortalProps> = ({
  lang,
  onToggleLang,
  onAuthenticated,
  initialMode = 'login'
}) => {
  const isRtl = lang === 'ar';

  // Step 1: Account Role Intent ('member' | 'owner')
  const [selectedIntent, setSelectedIntent] = useState<'member' | 'owner'>('member');

  // Step 2: Entry Platform Method ('telegram' | 'discord' | 'email')
  const [entryMethod, setEntryMethod] = useState<'telegram' | 'discord' | 'email'>('telegram');

  // Email Auth Sub-Mode
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>(initialMode);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // UI States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [retrievedTokenNotice, setRetrievedTokenNotice] = useState<string | null>(null);

  // Telegram Setup Info Modal
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [telegramConfig, setTelegramConfig] = useState<{
    botUsername: string;
    clientId?: string;
    isConfigured: boolean;
    allowedRedirectUrl?: string;
    appUrl?: string;
    domain?: string;
    origin?: string;
    botFatherInstructions: string[];
  } | null>(null);

  const openTelegramSetupInfo = async () => {
    setShowTelegramModal(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/telegram/config');
      const data = await res.json();
      if (data.success) {
        setTelegramConfig(data);
      }
    } catch {
      // Non-blocking
    }
  };

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const oauthErr = params.get('auth_error') || params.get('discord_error');
      if (oauthErr) {
        params.delete('auth_error');
        params.delete('discord_error');
        const cleanUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
        window.history.replaceState({}, document.title, cleanUrl);
        const timer = setTimeout(() => setErrorMessage(oauthErr), 0);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  // 1. Handle Email Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!email.trim() || !password.trim()) {
      setErrorMessage(isRtl ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور' : 'Please provide both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || (isRtl ? 'فشل تسجيل الدخول: تحقق من البريد أو كلمة المرور' : 'Invalid email or password.'));
        return;
      }

      setSuccessMessage(isRtl ? 'تم تسجيل الدخول بنجاح! جاري التوجيه...' : 'Authenticated successfully! Redirecting...');
      const user = data.user;
      setTimeout(() => {
        onAuthenticated(user, selectedIntent, false);
      }, 300);
    } catch (err: any) {
      setErrorMessage(err.message || (isRtl ? 'حدث خطأ في الاتصال' : 'Connection error during authentication.'));
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Email Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMessage(isRtl ? 'الاسم، البريد الإلكتروني، وكلمة المرور حقول مطلوبة' : 'Full name, email, and password are required.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage(isRtl ? 'يجب ألا تقل كلمة المرور عن 8 أحرف' : 'Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          bio: bio.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || (isRtl ? 'فشل إنشاء الحساب' : 'Failed to register account.'));
        return;
      }

      setSuccessMessage(isRtl ? 'تم إنشاء الحساب بنجاح! مرحباً بك في Community OS' : 'Account created successfully! Welcome to Community OS.');
      const user = data.user;
      setTimeout(() => {
        onAuthenticated(user, selectedIntent, true);
      }, 300);
    } catch (err: any) {
      setErrorMessage(err.message || (isRtl ? 'حدث خطأ أثناء التسجيل' : 'An error occurred during registration.'));
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Forgot Password Request
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setRetrievedTokenNotice(null);

    if (!email.trim()) {
      setErrorMessage(isRtl ? 'يرجى إدخال بريدك الإلكتروني' : 'Please provide your account email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || (isRtl ? 'لم نتمكن من العثور على هذا الحساب' : 'Unable to find an account with that email.'));
        return;
      }

      setSuccessMessage(
        isRtl
          ? 'تم إنشاء رمز استعادة كلمة المرور لمرة واحدة بنجاح.'
          : 'A single-use password reset token has been generated.'
      );

      if (data.devResetToken) {
        setRetrievedTokenNotice(data.devResetToken);
        setResetToken(data.devResetToken);
      }
      setMode('reset');
    } catch (err: any) {
      setErrorMessage(err.message || (isRtl ? 'فشل إرسال طلب الاستعادة' : 'Failed to request password reset.'));
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Password Reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!resetToken.trim() || !newPassword.trim()) {
      setErrorMessage(isRtl ? 'رمز الاستعادة وكلمة المرور الجديدة مطلوبان' : 'Reset token and new password are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: resetToken.trim(),
          newPassword
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || (isRtl ? 'رمز الاستعادة غير صالح أو منتهي الصلاحية' : 'Invalid or expired reset token.'));
        return;
      }

      setSuccessMessage(isRtl ? 'تم تحديث كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول.' : 'Password reset successfully! Please sign in with your new password.');
      setPassword(newPassword);
      setMode('login');
    } catch (err: any) {
      setErrorMessage(err.message || (isRtl ? 'حدث خطأ أثناء تعيين كلمة المرور' : 'Error updating password.'));
    } finally {
      setLoading(false);
    }
  };

  const telegramAuthHref = `/api/auth/telegram/authorize?redirect=true&intent=${selectedIntent}`;
  const discordAuthHref = `/api/discord/connect?mode=user&redirect=true&intent=${selectedIntent}`;

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white"
    >
      {/* Top Navbar */}
      <nav className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-lg text-white">Community OS</span>
              <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-mono font-medium text-indigo-400 border border-indigo-500/20">
                SaaS Ledger
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {isRtl ? 'نظام تشغيل وإدارة المجتمعات اللامركزية والنتائج الموثقة' : 'Outcome-Based Community Coordination System'}
            </p>
          </div>
        </div>

        <button
          onClick={onToggleLang}
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
          title="Toggle Language"
        >
          <Globe className="h-3.5 w-3.5 text-indigo-400" />
          <span>{lang === 'en' ? 'العربية' : 'English'}</span>
        </button>
      </nav>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 lg:py-10 grid lg:grid-cols-12 gap-10 items-start lg:items-center">
        {/* Left Column: Product Value Proposition */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>
                {isRtl ? 'مساحة منظمة للأعضاء ومديري المجموعات والخوادم' : 'Structured Access for Members & Community Owners'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {isRtl ? (
                <>
                  حوّل نشاط مجتمعك إلى <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-sky-400 bg-clip-text text-transparent">نتائج موثوقة ومثبتة</span>
                </>
              ) : (
                <>
                  Turn community discussions into <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-sky-400 bg-clip-text text-transparent">verified outcomes</span>
                </>
              )}
            </h1>

            <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
              {isRtl
                ? 'ابدأ بتيلغرام فقط، أو ديسكورد فقط، أو البريد الإلكتروني — ويمكنك لاحقاً إضافة المنصة الثانية بضغطة واحدة والتنقل بسلاسة بين جروباتك كعضو ومجتمعك كمالك.'
                : 'Start with Telegram only, Discord only, or email — add the second platform anytime later, and switch seamlessly between joined groups and your own server or group.'}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3.5">
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold">
                <Zap className="h-4 w-4" />
                <span>NeedSignal &amp; QuestLoop</span>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                {isRtl
                  ? 'طلبات مساعدة منظمة، عروض متخصصين، ومهام تسليم واضحة المواعيد.'
                  : 'Structured help requests matched to specialist offers and clear deliverable tasks.'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <Award className="h-4 w-4" />
                <span>SourceTrail &amp; Passport</span>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                {isRtl
                  ? 'توثيق أدلة العمل ومراجعة الأقران مع سجل مهارات محمول وموثق.'
                  : 'Verifiable deliverable evidence, peer review, and a portable contributor passport.'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold">
                <Send className="h-4 w-4" />
                <span>{isRtl ? 'بوابة تيلغرام المتكاملة' : 'Telegram Group & Bot Hub'}</span>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                {isRtl
                  ? 'تسجيل دخول رسمي OIDC وأوامر تفاعلية وقوائم مثبتة داخل مجموعات تيلغرام.'
                  : 'Official OIDC sign-in, interactive inline menus, and real-time bot webhook commands.'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-[#9aa8ff] text-xs font-semibold">
                <Bot className="h-4 w-4" />
                <span>{isRtl ? 'بوابة ديسكورد المتكاملة' : 'Discord Server & Slash Hub'}</span>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                {isRtl
                  ? 'أوامر Slash مشفرة بـ Ed25519 وربط مباشر للخوادم والأدوار.'
                  : 'Ed25519-verified slash commands, interactive embeds, and role-synced server hubs.'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Organized Step-by-Step Authentication Card */}
        <div className="lg:col-span-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/85 backdrop-blur-xl p-6 sm:p-7 shadow-2xl shadow-indigo-950/30 space-y-6">
            {/* STEP 1: SELECT ACCOUNT ROLE */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold">
                  {isRtl ? 'الخطوة 1 · حدد دورك الأساسي' : 'Step 1 · Choose Your Role'}
                </span>
                <span className="text-[11px] text-slate-500">
                  {isRtl ? 'يمكنك التبديل لاحقاً بينهما' : 'Switchable anytime inside'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedIntent('member')}
                  className={`rounded-xl border p-3.5 text-start transition-all flex items-start gap-3 ${
                    selectedIntent === 'member'
                      ? 'border-indigo-500 bg-indigo-950/40 ring-1 ring-indigo-500/60'
                      : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                      selectedIntent === 'member'
                        ? 'bg-indigo-500/20 border-indigo-400/50 text-indigo-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{isRtl ? 'عضو في مجتمع' : 'Community Member'}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      {isRtl
                        ? 'الانضمام للمجتمعات، تنفيذ المهام وتوثيق جواز سفرك.'
                        : 'Join groups/servers, claim tasks & build verified proof.'}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedIntent('owner')}
                  className={`rounded-xl border p-3.5 text-start transition-all flex items-start gap-3 ${
                    selectedIntent === 'owner'
                      ? 'border-amber-500 bg-amber-950/30 ring-1 ring-amber-500/60'
                      : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                      selectedIntent === 'owner'
                        ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Crown className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{isRtl ? 'صاحب جروب أو خادم' : 'Group / Server Owner'}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      {isRtl
                        ? 'ربط بوت ديسكورد وتيلغرام وإدارة الأعضاء والمراجعات.'
                        : 'Connect Discord/Telegram bots, govern rules & review work.'}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* STEP 2: CHOOSE ENTRY PLATFORM (TELEGRAM ONLY / DISCORD ONLY / EMAIL) */}
            <div className="space-y-3 border-t border-slate-800/80 pt-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-sky-400 font-semibold">
                  {isRtl ? 'الخطوة 2 · اختر طريقة الدخول' : 'Step 2 · Choose Sign-In Platform'}
                </span>
                <span className="text-[11px] text-slate-500">
                  {isRtl ? 'منصة واحدة تكفي للبدء' : 'Pick one to start'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-950 p-1.5 border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEntryMethod('telegram');
                    setErrorMessage(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-semibold transition-all whitespace-nowrap ${
                    entryMethod === 'telegram'
                      ? 'bg-[#229ED9]/25 text-[#6ecdf9] border border-[#229ED9]/50 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Send className="h-3.5 w-3.5 shrink-0" />
                  <span>{isRtl ? 'تيلغرام فقط' : 'Telegram'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEntryMethod('discord');
                    setErrorMessage(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-semibold transition-all whitespace-nowrap ${
                    entryMethod === 'discord'
                      ? 'bg-[#5865F2]/25 text-[#a5b2ff] border border-[#5865F2]/50 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Bot className="h-3.5 w-3.5 shrink-0" />
                  <span>{isRtl ? 'ديسكورد فقط' : 'Discord'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEntryMethod('email');
                    setErrorMessage(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-semibold transition-all whitespace-nowrap ${
                    entryMethod === 'email'
                      ? 'bg-indigo-600/30 text-white border border-indigo-500/50 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span>{isRtl ? 'البريد الإلكتروني' : 'Email'}</span>
                </button>
              </div>
            </div>

            {/* Notification Messages */}
            {errorMessage && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {retrievedTokenNotice && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 space-y-1">
                <div className="font-semibold">{isRtl ? 'رمز الاستعادة لمرة واحدة:' : 'Single-Use Reset Token:'}</div>
                <div className="font-mono bg-slate-950 p-1.5 rounded select-all text-amber-200">{retrievedTokenNotice}</div>
              </div>
            )}

            {/* ============================================================== */}
            {/* PLATFORM PANEL A: TELEGRAM ONLY                                */}
            {/* ============================================================== */}
            {entryMethod === 'telegram' && (
              <div className="rounded-xl border border-[#229ED9]/35 bg-[#229ED9]/5 p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Send className="h-4 w-4 text-[#5dc5f7]" />
                      <span>
                        {isRtl
                          ? `الدخول السريع عبر تيلغرام (${selectedIntent === 'owner' ? 'كصاحب جروب' : 'كعضو'})`
                          : `Continue with Telegram Only (${selectedIntent === 'owner' ? 'Group Owner' : 'Member'})`}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isRtl
                        ? 'سيتم تسجيل دخولك أو إنشاء حسابك وربط معرف تيلغرام تلقائياً عبر OpenID Connect.'
                        : 'Sign in or create your account and automatically bind your Telegram identity via official OpenID Connect.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openTelegramSetupInfo}
                    title={isRtl ? 'إعدادات BotFather OIDC' : 'Telegram BotFather OIDC Setup'}
                    className="rounded-lg border border-[#229ED9]/30 bg-slate-950/70 hover:bg-slate-900 p-2 text-[#5dc5f7] shrink-0"
                  >
                    <Shield className="h-4 w-4" />
                  </button>
                </div>

                <a
                  href={telegramAuthHref}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#229ED9] hover:bg-[#1e8ec3] py-3 text-xs font-bold text-white shadow-lg shadow-sky-900/30 transition-all"
                >
                  <Send className="h-4 w-4" />
                  <span>
                    {selectedIntent === 'owner'
                      ? isRtl
                        ? 'متابعة بتيلغرام كصاحب جروب'
                        : 'Continue with Telegram as Owner'
                      : isRtl
                      ? 'متابعة بتيلغرام كعضو'
                      : 'Continue with Telegram as Member'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </a>

                <div className="flex items-center gap-2 text-[11px] text-slate-400 border-t border-[#229ED9]/20 pt-3">
                  <Layers className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span>
                    {isRtl
                      ? 'هل تريد إضافة ديسكورد لاحقاً؟ يمكنك ربط حساب ديسكورد في أي وقت من لوحة حسابك.'
                      : 'Started with Telegram? You can add and link Discord anytime from your Connected Accounts panel.'}
                  </span>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* PLATFORM PANEL B: DISCORD ONLY                                 */}
            {/* ============================================================== */}
            {entryMethod === 'discord' && (
              <div className="rounded-xl border border-[#5865F2]/35 bg-[#5865F2]/5 p-5 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Bot className="h-4 w-4 text-[#9aa8ff]" />
                    <span>
                      {isRtl
                        ? `الدخول السريع عبر ديسكورد (${selectedIntent === 'owner' ? 'كصاحب خادم' : 'كعضو'})`
                        : `Continue with Discord Only (${selectedIntent === 'owner' ? 'Server Owner' : 'Member'})`}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {isRtl
                      ? 'سيتم تسجيل دخولك أو إنشاء حسابك وربط معرف ديسكورد مباشرة عبر Discord OAuth2.'
                      : 'Sign in or create your account and automatically bind your Discord identity via official OAuth2.'}
                  </p>
                </div>

                <a
                  href={discordAuthHref}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#5865F2] hover:bg-[#4c58e2] py-3 text-xs font-bold text-white shadow-lg shadow-indigo-900/30 transition-all"
                >
                  <Bot className="h-4 w-4" />
                  <span>
                    {selectedIntent === 'owner'
                      ? isRtl
                        ? 'متابعة بديسكورد كصاحب خادم'
                        : 'Continue with Discord as Owner'
                      : isRtl
                      ? 'متابعة بديسكورد كعضو'
                      : 'Continue with Discord as Member'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </a>

                <div className="flex items-center gap-2 text-[11px] text-slate-400 border-t border-[#5865F2]/20 pt-3">
                  <Layers className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span>
                    {isRtl
                      ? 'هل تريد إضافة تيلغرام لاحقاً؟ يمكنك ربط حساب تيلغرام في أي وقت من لوحة حسابك.'
                      : 'Started with Discord? You can add and link Telegram anytime from your Connected Accounts panel.'}
                  </span>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* PLATFORM PANEL C: EMAIL & PASSWORD                             */}
            {/* ============================================================== */}
            {entryMethod === 'email' && (
              <div className="space-y-4">
                {(mode === 'login' || mode === 'signup') && (
                  <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                        mode === 'login'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {isRtl ? 'تسجيل الدخول' : 'Sign In'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                        mode === 'signup'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {isRtl ? 'حساب جديد' : 'Create Account'}
                    </button>
                  </div>
                )}

                {mode === 'login' && (
                  <form onSubmit={handleLogin} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        {isRtl ? 'البريد الإلكتروني' : 'Email Address'}
                      </label>
                      <div className="relative">
                        <Mail className="absolute top-3 left-3 h-4 w-4 text-slate-500" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@domain.com"
                          required
                          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 pl-9 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-300">
                          {isRtl ? 'كلمة المرور' : 'Password'}
                        </label>
                        <button
                          type="button"
                          onClick={() => setMode('forgot')}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300"
                        >
                          {isRtl ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute top-3 left-3 h-4 w-4 text-slate-500" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          required
                          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 pl-9 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>{isRtl ? 'جاري التحقق...' : 'Signing in...'}</span>
                        </>
                      ) : (
                        <>
                          <span>
                            {selectedIntent === 'owner'
                              ? isRtl
                                ? 'دخول كصاحب جروب / خادم'
                                : 'Sign In to Owner Workspace'
                              : isRtl
                              ? 'دخول كعضو'
                              : 'Sign In to Member Space'}
                          </span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>

                    <p className="text-[11px] text-slate-400 text-center">
                      {isRtl
                        ? 'بعد الدخول بالبريد، يمكنك ربط تيلغرام أو ديسكورد أو كليهما من إعدادات الحساب.'
                        : 'You can link Telegram, Discord, or both right after signing in.'}
                    </p>
                  </form>
                )}

                {mode === 'signup' && (
                  <form onSubmit={handleSignUp} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        {isRtl ? 'الاسم الكامل' : 'Full Name'}
                      </label>
                      <div className="relative">
                        <UserIcon className="absolute top-3 left-3 h-4 w-4 text-slate-500" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Jane Doe"
                          required
                          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 pl-9 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        {isRtl ? 'البريد الإلكتروني' : 'Email Address'}
                      </label>
                      <div className="relative">
                        <Mail className="absolute top-3 left-3 h-4 w-4 text-slate-500" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="jane@example.com"
                          required
                          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 pl-9 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        {isRtl ? 'كلمة المرور (8 أحرف على الأقل)' : 'Password (min. 8 characters)'}
                      </label>
                      <div className="relative">
                        <Lock className="absolute top-3 left-3 h-4 w-4 text-slate-500" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create secure password"
                          required
                          minLength={8}
                          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 pl-9 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        {isRtl ? 'نبذة مهنية موجزة (اختياري)' : 'Brief Bio (Optional)'}
                      </label>
                      <textarea
                        rows={2}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder={
                          isRtl
                            ? 'مهندس نظم، مدير مجتمع، أو مساهم...'
                            : 'Community builder, full-stack contributor...'
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>{isRtl ? 'جاري التسجيل...' : 'Creating Account...'}</span>
                        </>
                      ) : (
                        <>
                          <span>
                            {selectedIntent === 'owner'
                              ? isRtl
                                ? 'إنشاء حساب صاحب جروب / خادم'
                                : 'Create Owner Account'
                              : isRtl
                              ? 'إنشاء حساب عضو'
                              : 'Create Member Account'}
                          </span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {mode === 'forgot' && (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="text-xs text-slate-300">
                      {isRtl
                        ? 'أدخل بريدك الإلكتروني لإنشاء رمز إعادة تعيين كلمة المرور.'
                        : 'Enter your account email address to request a single-use password reset token.'}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        {isRtl ? 'البريد الإلكتروني' : 'Email Address'}
                      </label>
                      <div className="relative">
                        <Mail className="absolute top-3 left-3 h-4 w-4 text-slate-500" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@domain.com"
                          required
                          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 pl-9 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs font-semibold text-white transition-all disabled:opacity-50"
                    >
                      {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                      <span>{isRtl ? 'إرسال رمز الاستعادة' : 'Generate Reset Token'}</span>
                    </button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setMode('login')}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        {isRtl ? 'العودة لتسجيل الدخول' : 'Back to Sign In'}
                      </button>
                    </div>
                  </form>
                )}

                {mode === 'reset' && (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        {isRtl ? 'رمز الاستعادة (Token)' : 'Reset Token'}
                      </label>
                      <input
                        type="text"
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        placeholder="rst_..."
                        required
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        {isRtl ? 'كلمة المرور الجديدة' : 'New Password (min. 8 characters)'}
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New secure password"
                        required
                        minLength={8}
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-semibold text-white transition-all disabled:opacity-50"
                    >
                      {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      <span>{isRtl ? 'حفظ كلمة المرور الجديدة' : 'Set New Password'}</span>
                    </button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setMode('login')}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        {isRtl ? 'إلغاء والعودة لتسجيل الدخول' : 'Cancel & Return to Sign In'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-4 text-center text-xs text-slate-500">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Community OS — Multi-Tenant Decentralized Coordination Ledger &amp; Official Bot Hub.
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="text-slate-300 hover:text-emerald-300 underline-offset-4 hover:underline transition-colors font-medium"
            >
              {isRtl ? 'الخصوصية والسياسات' : 'Privacy & Policies'}
            </Link>
          </div>
        </div>
      </footer>

      {/* Telegram OIDC & BotFather Config Info Modal */}
      {showTelegramModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-sky-950/50 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sky-400">
                <Send className="h-5 w-5" />
                <h3 className="text-sm font-bold text-white">
                  {isRtl ? 'إعدادات Telegram OIDC' : 'Telegram OpenID Connect Setup'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTelegramModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-3 text-xs text-sky-300 flex items-start gap-2">
                <Bot className="h-4 w-4 shrink-0 text-sky-400 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">
                    Official Bot: @{telegramConfig?.botUsername || 'CommunityOutcomeBot'}
                  </div>
                  <div className="text-[11px] text-sky-300/80">
                    {telegramConfig?.isConfigured
                      ? 'Official Telegram bot credentials active on server.'
                      : 'Server bot token configured. Domain registration required in BotFather.'}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-300">
                    {isRtl ? 'رابط إعادة التوجيه المصرح به في @BotFather:' : 'BotFather Allowed Redirect URL (OIDC):'}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    PKCE S256
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-sky-300 break-all select-all">
                  {telegramConfig?.allowedRedirectUrl ||
                    (typeof window !== 'undefined'
                      ? `${window.location.origin}/api/auth/telegram/callback`
                      : 'https://.../api/auth/telegram/callback')}
                </div>
                <div className="text-[11px] text-slate-400 space-y-1 font-mono">
                  <div>1. Message <span className="text-sky-300">@BotFather</span> on Telegram</div>
                  <div>
                    2. Send <span className="text-amber-300">/mybots</span> &amp; select{' '}
                    <span className="text-sky-300">@{telegramConfig?.botUsername || 'CommunityOutcomeBot'}</span>
                  </div>
                  <div>
                    3. Choose <span className="text-sky-300">Bot Settings</span> &rarr;{' '}
                    <span className="text-sky-300">OpenID Connect Login</span>
                  </div>
                  <div>
                    4. Select <span className="text-amber-300">Allowed Redirect URLs</span> &amp; add the URL above
                  </div>
                </div>
              </div>

              <a
                href={telegramAuthHref}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#229ED9] hover:bg-[#1f8ec4] py-2.5 text-xs font-semibold text-white shadow-lg shadow-sky-600/30 transition-all"
              >
                <Send className="h-4 w-4" />
                <span>{isRtl ? 'فتح نافذة تفويض Telegram الرسمية' : 'Launch Official Telegram OIDC Login'}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
