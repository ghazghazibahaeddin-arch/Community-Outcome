'use client';

import React, { useState } from 'react';
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
  ExternalLink,
  Copy
} from 'lucide-react';

interface AuthPortalProps {
  lang: Language;
  onToggleLang: () => void;
  onAuthenticated: (user: User, defaultWorkspace: 'owner' | 'member') => void;
  discordInstallUrl?: string;
}

export const AuthPortal: React.FC<AuthPortalProps> = ({
  lang,
  onToggleLang,
  onAuthenticated,
  discordInstallUrl
}) => {
  const isRtl = lang === 'ar';
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // UI States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [retrievedTokenNotice, setRetrievedTokenNotice] = useState<string | null>(null);

  // Telegram Login Modal States
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
  const openTelegramLogin = async () => {
    setShowTelegramModal(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/telegram/config');
      const data = await res.json();
      if (data.success) {
        setTelegramConfig(data);
      }
    } catch {
      // Fallback
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

  // 1. Handle Login
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
      const isOwner = user.platformRole === 'platform_admin' || user.platformRole === 'community_owner';
      setTimeout(() => {
        onAuthenticated(user, isOwner ? 'owner' : 'member');
      }, 400);
    } catch (err: any) {
      setErrorMessage(err.message || (isRtl ? 'حدث خطأ في الاتصال' : 'Connection error during authentication.'));
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Sign Up
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
        onAuthenticated(user, 'member');
      }, 400);
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

      // In development/test mode, the server returns the generated reset token for inspection
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
              <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-mono font-medium text-indigo-400 border border-indigo-500/20">
                v2.6 SaaS
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {isRtl ? 'نظام تشغيل وإدارة المجتمعات اللامركزية والنتائج الموثقة' : 'Outcome-Based Community Coordination System'}
            </p>
          </div>
        </div>

        {/* Language Switcher */}
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
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-10 grid lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Product Showcase & Value Proposition */}
        <div className="lg:col-span-7 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>
                {isRtl ? 'المنصة الإنتاجية لإدارة مخرجات المجتمعات وبوتات التيليجرام والديسكورد' : 'Unified Ecosystem for High-Trust Communities & Bots'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              {isRtl ? (
                <>
                  حوّل نشاط مجتمعك إلى <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-fuchsia-400 bg-clip-text text-transparent">نتائج موثوقة ومثبتة</span>
                </>
              ) : (
                <>
                  Turn community discussions into <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-fuchsia-400 bg-clip-text text-transparent">verified outcomes</span>
                </>
              )}
            </h1>

            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-2xl">
              {isRtl
                ? 'نظام شامل يربط خوادم Discord ومجموعات Telegram بلوحة تحكم مركزية وقاعدة بيانات موحدة، مع مسارات منفصلة للأعضاء وأصحاب المجتمعات، وتوثيق حقيقي للإنجازات والمهام.'
                : 'A structured coordination OS bridging Discord servers, Telegram supergroups, and a unified PostgreSQL database with isolated Member and Owner workspaces.'}
            </p>
          </div>

          {/* Core Feature Pillars */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-2 hover:border-indigo-500/30 transition-colors">
              <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold">
                <Zap className="h-4 w-4" />
                <span>NeedSignal</span>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                {isRtl
                  ? 'طلب المساعدة المنظم مع مطابقة فورية للمهارات وعروض المتخصصين.'
                  : 'Structured help requests with immediate capability matching and verified specialist offers.'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-2 hover:border-violet-500/30 transition-colors">
              <div className="flex items-center gap-2 text-violet-400 text-sm font-semibold">
                <Layers className="h-4 w-4" />
                <span>QuestLoop</span>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                {isRtl
                  ? 'تحويل الخطط والطلبات إلى مهام تسليم واضحة مع التزامات ومواعيد نهائية.'
                  : 'Actionable deliverable tasks with explicit member commitments, handoffs, and audit trails.'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-2 hover:border-emerald-500/30 transition-colors">
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                <Award className="h-4 w-4" />
                <span>SourceTrail & Passport</span>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                {isRtl
                  ? 'توثيق الأدلة ومراجعة الأقران، مع جواز سفر مهني محمول للمهارات المعتمدة.'
                  : 'Cryptographic peer review, reproducible evidence links, and portable member passports.'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-2 hover:border-sky-500/30 transition-colors">
              <div className="flex items-center gap-2 text-sky-400 text-sm font-semibold">
                <Bot className="h-4 w-4" />
                <span>Discord & Telegram Bots</span>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                {isRtl
                  ? 'تكامل حي مع البوتات الرسمية؛ قوائم تفاعلية وأزرار فورية داخل قنواتك ومجموعاتك.'
                  : 'Real-time WebSocket & long-polling bots with persistent in-group menus and slash commands.'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Authentication Card */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/40">
            {/* Mode Switcher Tabs */}
            <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800/80 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 rounded-md py-2 text-xs font-semibold transition-all ${
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
                className={`flex-1 rounded-md py-2 text-xs font-semibold transition-all ${
                  mode === 'signup'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isRtl ? 'إنشاء حساب جديد' : 'Sign Up'}
              </button>
            </div>

            {/* Notification Messages */}
            {errorMessage && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {retrievedTokenNotice && (
              <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 space-y-1">
                <div className="font-semibold">{isRtl ? 'رمز الاستعادة لمرة واحدة (بيئة التطوير):' : 'Single-Use Reset Token (Dev Notice):'}</div>
                <div className="font-mono bg-slate-950 p-1.5 rounded select-all text-amber-200">{retrievedTokenNotice}</div>
              </div>
            )}

            {/* ============================================================== */}
            {/* MODE: SIGN IN */}
            {/* ============================================================== */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
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
                  <div className="flex items-center justify-between mb-1.5">
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
                      <span>{isRtl ? 'تسجيل الدخول' : 'Sign In'}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                {/* Direct Discord & Telegram Login + Automatic Account Linking */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-slate-900 px-2 text-slate-400 font-mono">
                      {isRtl ? 'أو سجّل دخولك واربط حسابك مباشرة' : 'Or sign in & link account directly'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <a
                    href="/api/discord/connect?mode=user&redirect=true"
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#5865F2]/50 bg-[#5865F2]/15 hover:bg-[#5865F2]/25 py-2.5 text-xs font-semibold text-[#9aa8ff] transition-all"
                  >
                    <Bot className="h-4 w-4" />
                    <span>{isRtl ? 'تسجيل الدخول والربط عبر Discord' : 'Continue & Link with Discord'}</span>
                  </a>

                  <div className="flex items-center gap-1.5">
                    <a
                      href="/api/auth/telegram/authorize?redirect=true"
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-[#229ED9]/50 bg-[#229ED9]/15 hover:bg-[#229ED9]/25 py-2.5 text-xs font-semibold text-[#5dc5f7] transition-all"
                    >
                      <Send className="h-4 w-4" />
                      <span>{isRtl ? 'تسجيل الدخول والربط عبر Telegram' : 'Continue & Link with Telegram'}</span>
                    </a>
                    <button
                      type="button"
                      onClick={openTelegramLogin}
                      title="Telegram Setup & BotFather Instructions"
                      className="rounded-lg border border-[#229ED9]/30 bg-[#229ED9]/5 hover:bg-[#229ED9]/15 px-2.5 py-2.5 text-xs text-[#54bbf0]"
                    >
                      <Shield className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* ============================================================== */}
            {/* MODE: SIGN UP */}
            {/* ============================================================== */}
            {mode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-4">
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
                    {isRtl ? 'نبذة مهنية موجزة' : 'Brief Collaboration Bio'}
                  </label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={
                      isRtl
                        ? 'مهندس نظم موزعة ومساهم في البرمجيات مفتوحة المصدر...'
                        : 'Full-stack developer interested in automated bot workflows...'
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
                      <span>{isRtl ? 'إنشاء حسابي' : 'Create My Account'}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                {/* Continue with Discord & Telegram in Signup */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-slate-900 px-2 text-slate-400 font-mono">
                      {isRtl ? 'أو التسجيل والربط المباشر عبر' : 'Or register & link directly with'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <a
                    href="/api/discord/connect?mode=user&redirect=true"
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#5865F2]/50 bg-[#5865F2]/15 hover:bg-[#5865F2]/25 py-2.5 text-xs font-semibold text-[#9aa8ff] transition-all"
                  >
                    <Bot className="h-4 w-4" />
                    <span>{isRtl ? 'التسجيل والربط بحساب Discord' : 'Continue & Link with Discord'}</span>
                  </a>

                  <div className="flex items-center gap-1.5">
                    <a
                      href="/api/auth/telegram/authorize?redirect=true"
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-[#229ED9]/50 bg-[#229ED9]/15 hover:bg-[#229ED9]/25 py-2.5 text-xs font-semibold text-[#5dc5f7] transition-all"
                    >
                      <Send className="h-4 w-4" />
                      <span>{isRtl ? 'التسجيل والربط بحساب Telegram' : 'Continue & Link with Telegram'}</span>
                    </a>
                    <button
                      type="button"
                      onClick={openTelegramLogin}
                      title="Telegram Setup & BotFather Instructions"
                      className="rounded-lg border border-[#229ED9]/30 bg-[#229ED9]/5 hover:bg-[#229ED9]/15 px-2.5 py-2.5 text-xs text-[#54bbf0]"
                    >
                      <Shield className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* ============================================================== */}
            {/* MODE: FORGOT PASSWORD */}
            {/* ============================================================== */}
            {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="text-xs text-slate-300">
                  {isRtl
                    ? 'أدخل بريدك الإلكتروني لإنشاء رمز إعادة تعيين كلمة المرور.'
                    : 'Enter your account email address to request a secure one-time password reset token.'}
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

            {/* ============================================================== */}
            {/* MODE: RESET PASSWORD */}
            {/* ============================================================== */}
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
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-4 text-center text-xs text-slate-500">
        <div>
          Community OS — Multi-Tenant Decentralized Coordination Ledger & Official Bot Hub.
        </div>
      </footer>

      {/* Telegram Official Login & OpenID Connect Modal */}
      {showTelegramModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-sky-950/50 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sky-400">
                <Send className="h-5 w-5" />
                <h3 className="text-sm font-bold text-white">
                  {isRtl ? 'تسجيل الدخول عبر Telegram' : 'Continue with Telegram'}
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

              {/* Exact BotFather OpenID Connect Allowed Redirect URL */}
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
                  {telegramConfig?.allowedRedirectUrl || (typeof window !== 'undefined' ? `${window.location.origin}/api/auth/telegram/callback` : 'https://.../api/auth/telegram/callback')}
                </div>
                <div className="text-[11px] text-slate-400 space-y-1 font-mono">
                  <div>1. Message <span className="text-sky-300">@BotFather</span> on Telegram</div>
                  <div>2. Send <span className="text-amber-300">/mybots</span> & select <span className="text-sky-300">@{telegramConfig?.botUsername || 'CommunityOutcomeBot'}</span></div>
                  <div>3. Choose <span className="text-sky-300">Bot Settings</span> &rarr; <span className="text-sky-300">OpenID Connect Login</span></div>
                  <div>4. Select <span className="text-amber-300">Allowed Redirect URLs</span> & add the URL above</div>
                </div>
              </div>

              {/* Direct Link to Launch Official OIDC */}
              <a
                href="/api/auth/telegram/authorize?redirect=true"
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
