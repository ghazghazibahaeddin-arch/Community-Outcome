'use client';

import React, { useState } from 'react';
import { User, Language } from '@/lib/types';
import {
  X,
  User as UserIcon,
  Bot,
  Send,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle,
  Unlink
} from 'lucide-react';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  lang: Language;
  onSignOut: () => void;
  onRefresh: () => void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  lang,
  onSignOut,
  onRefresh
}) => {
  const isRtl = lang === 'ar';

  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || user.passport?.biography || '');
  const [languages, setLanguages] = useState((user.passport?.languages || ['English']).join(', '));
  const [isSaving, setIsSaving] = useState(false);
  const [unlinkingPlatform, setUnlinkingPlatform] = useState<'discord' | 'telegram' | null>(null);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      setName(user.name);
      setBio(user.bio || user.passport?.biography || '');
      setLanguages((user.passport?.languages || ['English']).join(', '));
      setSaveStatus(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen, user.id, user.name, user.bio, user.passport?.biography, user.passport?.languages]);

  if (!isOpen) return null;

  const handleUnlinkPlatform = async (platform: 'discord' | 'telegram') => {
    setUnlinkingPlatform(platform);
    setSaveStatus(null);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'unlink_platform',
          payload: { userId: user.id, platform }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSaveStatus({
          type: 'error',
          text: data.error || (isRtl ? 'تعذر فك ربط المنصة' : `Failed to unlink ${platform}.`)
        });
        return;
      }
      setSaveStatus({
        type: 'success',
        text: isRtl
          ? `تم فك ربط ${platform === 'discord' ? 'ديسكورد' : 'تيلغرام'} بنجاح.`
          : `${platform === 'discord' ? 'Discord' : 'Telegram'} account unlinked.`
      });
      onRefresh();
    } catch (err: any) {
      setSaveStatus({
        type: 'error',
        text: err.message || (isRtl ? 'خطأ في الاتصال' : 'Connection error.')
      });
    } finally {
      setUnlinkingPlatform(null);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'update_user_profile',
          payload: {
            userId: user.id,
            name: name.trim(),
            bio: bio.trim(),
            languages: languages.split(',').map((s) => s.trim()).filter(Boolean)
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSaveStatus({
          type: 'error',
          text: data.error || (isRtl ? 'فشل حفظ الملف الشخصي' : 'Failed to update profile settings.')
        });
        return;
      }
      setSaveStatus({
        type: 'success',
        text: isRtl ? 'تم تحديث الملف الشخصي بنجاح!' : 'Profile settings updated successfully!'
      });
      onRefresh();
    } catch (err: any) {
      setSaveStatus({
        type: 'error',
        text: err.message || (isRtl ? 'خطأ في الاتصال' : 'Connection error.')
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-[#0c121e] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <UserIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isRtl ? 'إعدادات الحساب والهوية' : 'Account & Identity Settings'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isRtl ? 'إدارة ملفك الشخصي والهويات المربوطة' : 'Manage your verified profile and linked accounts'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
          {saveStatus && (
            <div
              className={`rounded-lg p-3 text-xs flex items-center gap-2 ${
                saveStatus.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border border-red-500/30 text-red-300'
              }`}
            >
              {saveStatus.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              )}
              <span>{saveStatus.text}</span>
            </div>
          )}

          {/* Read-Only Account Identifiers */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800/60 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">
                {isRtl ? 'معرف المستخدم' : 'User ID'}
              </span>
              <span className="font-mono text-slate-300 select-all">{user.id}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">
                {isRtl ? 'الدور في المنصة' : 'Platform Role'}
              </span>
              <span className="font-semibold text-indigo-400 capitalize">{user.platformRole}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {isRtl ? 'الاسم الظاهر' : 'Display Name'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {isRtl ? 'البريد الإلكتروني' : 'Email Address'}
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {isRtl ? 'النبذة المهنية' : 'Collaboration Biography'}
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {isRtl ? 'اللغات (مفصولة بفاصلة)' : 'Languages (comma separated)'}
            </label>
            <input
              type="text"
              value={languages}
              onChange={(e) => setLanguages(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Connected Bot Identities (Completely Separated Discord & Telegram Cards) */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
            <h4 className="text-xs font-semibold text-slate-300">
              {isRtl ? 'حسابات التواصل المربوطة (أضف أو بدّل في أي وقت)' : 'Connected Platforms (Add, Switch, or Unlink Anytime)'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Discord Sub-Card */}
              <div className="p-3 rounded-lg bg-slate-950 border border-[#5865F2]/30 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <Bot className="h-3.5 w-3.5 text-[#9aa8ff]" />
                    <span>Discord</span>
                  </div>
                  {user.identities?.discordId ? (
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {isRtl ? 'متصل' : 'Connected'}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">
                      {isRtl ? 'غير مربوط' : 'Not Linked'}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-mono truncate">
                  {user.identities?.discordUsername ? `@${user.identities.discordUsername}` : (isRtl ? 'لا يوجد حساب مربوط' : 'No Discord linked yet')}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <a
                    href="/api/discord/connect?mode=user&redirect=true"
                    className="text-[10px] font-semibold text-[#9aa8ff] bg-[#5865F2]/20 hover:bg-[#5865F2]/30 px-2.5 py-1 rounded border border-[#5865F2]/40 transition-colors"
                  >
                    {user.identities?.discordId ? (isRtl ? 'تبديل الحساب' : 'Re-link') : (isRtl ? 'ربط Discord' : 'Link Discord')}
                  </a>
                  {user.identities?.discordId && (
                    <button
                      type="button"
                      disabled={unlinkingPlatform === 'discord'}
                      onClick={() => handleUnlinkPlatform('discord')}
                      className="inline-flex items-center gap-1 text-[10px] text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 px-2 py-1 rounded border border-rose-800/50 disabled:opacity-50"
                    >
                      <Unlink className="h-2.5 w-2.5" />
                      <span>{unlinkingPlatform === 'discord' ? '...' : (isRtl ? 'فك الربط' : 'Unlink')}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Telegram Sub-Card */}
              <div className="p-3 rounded-lg bg-slate-950 border border-[#229ED9]/30 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <Send className="h-3.5 w-3.5 text-[#5dc5f7]" />
                    <span>Telegram</span>
                  </div>
                  {user.identities?.telegramId ? (
                    <span className="text-[10px] text-sky-400 font-mono bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                      {isRtl ? 'متصل' : 'Connected'}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">
                      {isRtl ? 'غير مربوط' : 'Not Linked'}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-mono truncate">
                  {user.identities?.telegramUsername ? `@${user.identities.telegramUsername}` : (isRtl ? 'لا يوجد حساب مربوط' : 'No Telegram linked yet')}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <a
                    href="/api/auth/telegram/authorize?redirect=true"
                    className="text-[10px] font-semibold text-[#5dc5f7] bg-[#229ED9]/20 hover:bg-[#229ED9]/30 px-2.5 py-1 rounded border border-[#229ED9]/40 transition-colors"
                  >
                    {user.identities?.telegramId ? (isRtl ? 'تبديل الحساب' : 'Re-link') : (isRtl ? 'ربط Telegram' : 'Link Telegram')}
                  </a>
                  {user.identities?.telegramId && (
                    <button
                      type="button"
                      disabled={unlinkingPlatform === 'telegram'}
                      onClick={() => handleUnlinkPlatform('telegram')}
                      className="inline-flex items-center gap-1 text-[10px] text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 px-2 py-1 rounded border border-rose-800/50 disabled:opacity-50"
                    >
                      <Unlink className="h-2.5 w-2.5" />
                      <span>{unlinkingPlatform === 'telegram' ? '...' : (isRtl ? 'فك الربط' : 'Unlink')}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <button
              type="button"
              onClick={onSignOut}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-3 py-2 text-xs font-medium text-red-300 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{isRtl ? 'تسجيل الخروج' : 'Sign Out'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow transition-all disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{isSaving ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : (isRtl ? 'حفظ التعديلات' : 'Save Changes')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
