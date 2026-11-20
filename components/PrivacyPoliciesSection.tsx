'use client';

import React, { useState, useEffect } from 'react';
import { Language, User } from '@/lib/types';
import {
  Shield,
  Lock,
  Scale,
  CreditCard,
  Bot,
  Send,
  Download,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileText
} from 'lucide-react';

interface PrivacyPoliciesSectionProps {
  currentUser?: User | null;
  lang: Language;
  onRefresh?: () => void;
}

export const PrivacyPoliciesSection: React.FC<PrivacyPoliciesSectionProps> = ({
  currentUser,
  lang,
  onRefresh
}) => {
  const isRtl = lang === 'ar';

  const [privacyState, setPrivacyState] = useState({
    showBio: currentUser?.privacy?.showBio ?? true,
    showSkills: currentUser?.privacy?.showSkills ?? true,
    showVerifiedOnly: currentUser?.privacy?.showVerifiedOnly ?? false,
    allowDiscovery: currentUser?.privacy?.allowDiscovery ?? true,
    allowCrossCommunitySharing: currentUser?.privacy?.allowCrossCommunitySharing ?? false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!currentUser?.privacy) return;
    const timer = setTimeout(() => {
      setPrivacyState({
        showBio: currentUser.privacy.showBio,
        showSkills: currentUser.privacy.showSkills,
        showVerifiedOnly: currentUser.privacy.showVerifiedOnly,
        allowDiscovery: currentUser.privacy.allowDiscovery,
        allowCrossCommunitySharing: currentUser.privacy.allowCrossCommunitySharing
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [currentUser]);

  const handleSavePrivacy = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'update_privacy',
          payload: {
            userId: currentUser.id,
            privacy: privacyState
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', text: data.error || 'Failed to save privacy preferences.' });
        return;
      }
      setFeedback({
        type: 'success',
        text: isRtl
          ? 'تم حفظ إعدادات الخصوصية والموافقة بنجاح.'
          : 'Privacy & consent settings saved cleanly.'
      });
      onRefresh?.();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Network error saving preferences.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadMyData = async () => {
    if (!currentUser || typeof window === 'undefined') return;
    setIsExporting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'export_my_data', payload: {} })
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.result) {
        setFeedback({
          type: 'error',
          text: data.error || (isRtl ? 'فشل تصدير البيانات من الخادم.' : 'Failed to export personal data.')
        });
        return;
      }
      const blob = new Blob([JSON.stringify(data.result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `community-os-data-${currentUser.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setFeedback({
        type: 'success',
        text: isRtl ? 'تم تنزيل سجل بياناتك الكامل بنجاح.' : 'Full personal data archive exported cleanly.'
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || (isRtl ? 'تعذر تصدير البيانات.' : 'Network error exporting data.')
      });
    } finally {
      setIsExporting(false);
    }
  };

  const toggleItems: {
    key: keyof typeof privacyState;
    titleEn: string;
    titleAr: string;
    descEn: string;
    descAr: string;
  }[] = [
    {
      key: 'showBio',
      titleEn: 'Show Collaboration Bio on Public Passport',
      titleAr: 'إظهار النبذة المهنية في جواز المهارات العام',
      descEn: 'Controls whether visitors viewing /p/[your-id] can see your biography.',
      descAr: 'يتحكم في إمكانية رؤية الزوار لنبذتك عند فتح رابط ملفك العام.'
    },
    {
      key: 'showSkills',
      titleEn: 'Display Skills List Publicly',
      titleAr: 'عرض قائمة المهارات للعامة',
      descEn: 'Allows communities to discover your verified and self-declared skills.',
      descAr: 'يسمح للمجتمعات والزملاء بمشاهدة مهاراتك.'
    },
    {
      key: 'showVerifiedOnly',
      titleEn: 'Verified Skills Only Mode',
      titleAr: 'إظهار المهارات الموثقة فقط',
      descEn: 'Hides self-declared skills from public view and shows peer-reviewed skills only.',
      descAr: 'يخفي المهارات غير الموثقة ويعرض فقط المهارات المعتمدة بمراجعة الأقران.'
    },
    {
      key: 'allowDiscovery',
      titleEn: 'Allow Member Directory Discovery',
      titleAr: 'السماح بالظهور في دليل الأعضاء',
      descEn: 'Lets community owners match your skills to open NeedSignal requests.',
      descAr: 'يتيح لأصحاب المجتمعات مطابقة مهاراتك مع طلبات المساعدة المفتوحة.'
    },
    {
      key: 'allowCrossCommunitySharing',
      titleEn: 'Portable Outcomes Across Communities',
      titleAr: 'مشاركة السجل المحمول عبر المجتمعات',
      descEn: 'Explicitly opt-in before your verified achievements are visible in other groups.',
      descAr: 'موافقة صريحة مطلوبة قبل مشاركة إنجازاتك الموثقة مع مجتمعات أخرى.'
    }
  ];

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6 space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{isRtl ? 'الثقة والحوكمة القانونية' : 'Trust, Compliance & Platform Governance'}</span>
          <span aria-hidden="true">·</span>
          <span>{isRtl ? 'محدثة لعام 2026' : 'Effective 2026'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          {isRtl ? 'سياسة الخصوصية وسياسات المنصة (Privacy & Policies)' : 'Privacy Policy & Platform Governance Policies'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
          {isRtl
            ? 'نوضح هنا بشفافية تامة كيف يتم جمع وحماية بياناتك، ما الصلاحيات التي تستخدمها بوتات ديسكورد وتيلغرام، قواعد النزاهة والحوكمة، وسياسات الفوترة والإلغاء.'
            : 'Transparent documentation of how your data is protected, exact Discord & Telegram bot scopes, community governance rules, billing policies, and direct consent controls.'}
        </p>
      </div>

      {/* Live Interactive Privacy Controls (for signed-in users) */}
      {currentUser && (
        <section className="rounded-2xl border border-indigo-500/30 bg-slate-900/40 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Eye className="h-4 w-4 text-indigo-400" />
                <span>{isRtl ? 'التحكم المباشر بخصوصية حسابك' : 'Your Live Privacy & Consent Controls'}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isRtl
                  ? 'أي تغيير هنا ينطبق فوراً على صفحتك العامة وسجلاتك المرتبطة.'
                  : 'Changes apply immediately to your public Passport URL and cross-community visibility.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isExporting}
                onClick={handleDownloadMyData}
                className="min-h-[40px] inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs font-semibold text-slate-200 hover:text-white transition-colors whitespace-nowrap disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" />
                <span>{isExporting ? (isRtl ? 'جاري التصدير...' : 'Exporting...') : (isRtl ? 'تنزيل بياناتي (JSON)' : 'Export My Data (JSON)')}</span>
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSavePrivacy}
                className="min-h-[40px] inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-500 transition-colors whitespace-nowrap disabled:opacity-50"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>{isSaving ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : (isRtl ? 'حفظ التفضيلات' : 'Save Privacy Settings')}</span>
              </button>
            </div>
          </div>

          {feedback && (
            <div
              className={`rounded-lg border p-3 text-xs flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                  : 'border-rose-500/40 bg-rose-950/30 text-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <div className="divide-y divide-slate-800/80">
            {toggleItems.map((item) => {
              const checked = privacyState[item.key];
              return (
                <label
                  key={item.key}
                  className="py-3.5 flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {isRtl ? item.titleAr : item.titleEn}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {isRtl ? item.descAr : item.descEn}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setPrivacyState((prev) => ({ ...prev, [item.key]: e.target.checked }))
                    }
                    className="h-5 w-5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 shrink-0"
                  />
                </label>
              );
            })}
          </div>
        </section>
      )}

      {/* 4 Structured Policy Pillars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Data Privacy & Bot Permissions */}
        <article className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <Shield className="h-5 w-5 text-emerald-400 shrink-0" />
            <h2 className="text-base font-bold text-white">
              {isRtl ? '1. خصوصية البيانات وصلاحيات البوتات' : '1. Data Collection & Bot Permissions Policy'}
            </h2>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
            <li className="flex items-start gap-2">
              <Bot className="h-4 w-4 text-[#9aa8ff] shrink-0 mt-0.5" />
              <span>
                <strong>Discord:</strong>{' '}
                {isRtl
                  ? 'نطلب فقط معرف المستخدم والاسم والبريد عند تسجيل الدخول (identify, email)، وبوت الخادم يتفاعل فقط مع أوامر Slash المرسلة أو القوائم التفاعلية — لا نقرأ رسائلك الخاصة (DMs).'
                  : 'User OAuth uses strictly identify and email scopes. The server bot responds only to invoked slash commands (/requests, /tasks, /connect) and button clicks — private DMs are never harvested.'}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Send className="h-4 w-4 text-[#5dc5f7] shrink-0 mt-0.5" />
              <span>
                <strong>Telegram:</strong>{' '}
                {isRtl
                  ? 'تسجيل الدخول عبر OpenID Connect (PKCE S256) يشارك المعرف العام والاسم فقط. التحقق من مشرف الجروب يتم عبر Telegram Bot API بدون حفظ كلمات مرور أو أرقام هواتف.'
                  : 'Telegram OpenID Connect (PKCE S256) shares only your public ID, name, and username. Group admin checks use Telegram Bot API without storing phone numbers or passwords.'}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Lock className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>{isRtl ? 'العزل وفك الربط:' : 'Isolation & Revocation:'}</strong>{' '}
                {isRtl
                  ? 'يمكنك فك ربط حساب ديسكورد أو تيلغرام في أي لحظة، ويتم فصل بيانات كل مجتمع (Multi-tenant isolation) دون بيع أو مشاركة بياناتك.'
                  : 'You can unlink Discord or Telegram anytime in Account Settings. Community workspaces remain strictly isolated and personal data is never sold.'}
              </span>
            </li>
          </ul>
        </article>

        {/* 2. Platform Governance & Anti-Silence Rule */}
        <article className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <Scale className="h-5 w-5 text-amber-400 shrink-0" />
            <h2 className="text-base font-bold text-white">
              {isRtl ? '2. سياسات الحوكمة، النزاعات، والمراجعة' : '2. Community Governance & Anti-Silence Policy'}
            </h2>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
            <li>
              <strong>{isRtl ? 'قاعدة الصمت ≠ موافقة (Silence != Consent):' : 'Silence != Consent Rule:'}</strong>{' '}
              {isRtl
                ? 'لا يُعتمد أي إنجاز أو شهادة مهارة تلقائياً بمرور الوقت؛ يجب تأكيد الطرفين أو اعتماد مراجع معيّن مع رابط دليل قابل للفحص.'
                : 'Outcomes and skill verifications never auto-approve on silence. Explicit dual attestation or appointed reviewer sign-off with inspectable evidence is required.'}
            </li>
            <li>
              <strong>{isRtl ? 'شفافية الإشراف والنزاعات:' : 'Moderation & Dispute Rights:'}</strong>{' '}
              {isRtl
                ? 'كل إجراء إداري (تحذير، تجميد، إزالة، رفض مساهمة) يُسجل في سجل التدقيق غير القابل للتلاعب مع إتاحة حق تقديم نزاع ومراجعته.'
                : 'Every moderation decision or contribution rejection is logged with explicit reasoning in the community audit log, and members retain formal dispute appeal rights.'}
            </li>
            <li>
              <strong>{isRtl ? 'حماية القصر والاستخدام الآمن:' : 'Acceptable Use:'}</strong>{' '}
              {isRtl
                ? 'يُحظر استغلال أوامر البوتات للإزعاج (Spam) أو انتحال الهويات أو رفع روابط خبيثة في أدلة المهام.'
                : 'Bot command spamming, identity spoofing, and malicious evidence URLs are prohibited and subject to workspace suspension.'}
            </li>
          </ul>
        </article>

        {/* 3. Billing, Cancellation & Free Member Guarantee */}
        <article className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <CreditCard className="h-5 w-5 text-indigo-400 shrink-0" />
            <h2 className="text-base font-bold text-white">
              {isRtl ? '3. سياسة الدفع، الإلغاء، ومجانية الأعضاء' : '3. Billing, Cancellation & Member Free Policy'}
            </h2>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
            <li>
              <strong>{isRtl ? 'الأعضاء مجاناً دائماً:' : 'Members Always Free ($0):'}</strong>{' '}
              {isRtl
                ? 'العضو لا يدفع أي اشتراك أبداً؛ جميع أدوات المشاركة، الطلبات، المهام، وجواز المهارات مجانية للعضو.'
                : 'Members are never charged to join communities, claim tasks, or maintain their portable Passport.'}
            </li>
            <li>
              <strong>{isRtl ? 'متى وأين يدفع المالك:' : 'When & Where Owners Pay:'}</strong>{' '}
              {isRtl
                ? 'التأسيس والعمل الأساسي مجاني (1 مجتمع، 1 خادم ديسكورد، 1 جروب تيلغرام، 100 عضو). الدفع ($15/شهر عبر Whop Checkout) مطلوب فقط عند التوسع فوق هذه الحدود أو تفعيل مزايا Pro.'
                : 'Launching is free (1 community, 1 Discord server, 1 Telegram group, 100 members). Payment ($15/mo via Whop) only applies when expanding beyond Free limits.'}
            </li>
            <li>
              <strong>{isRtl ? 'الإلغاء والرجوع للخطة المجانية:' : 'Cancellation & Zero Data Loss:'}</strong>{' '}
              {isRtl
                ? 'يمكن للمالك إلغاء اشتراك Pro في أي وقت من لوحة Whop؛ يعود المجتمع للخطة المجانية عند نهاية الدورة دون حذف سجل الإنجازات أو الأعضاء.'
                : 'Cancel anytime inside Whop. Communities gracefully revert to Free Starter at period end with zero deletion of members or verified records.'}
            </li>
          </ul>
        </article>

        {/* 4. Security & Storage Architecture */}
        <article className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <FileText className="h-5 w-5 text-sky-400 shrink-0" />
            <h2 className="text-base font-bold text-white">
              {isRtl ? '4. سياسة الأمان، التوقيعات، وتخزين الجلسات' : '4. Cryptography, Sessions & Security Policy'}
            </h2>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
            <li>
              <strong>{isRtl ? 'الجلسات الآمنة:' : 'HttpOnly Cookie Sessions:'}</strong>{' '}
              {isRtl
                ? 'يتم حفظ جلسات الدخول في ملف تعريف ارتباط HttpOnly مقيد بالموقع (SameSite=Lax) ولا تُخزّن رموز الجلسة في الروابط.'
                : 'Session tokens are stored strictly in HttpOnly SameSite=Lax cookies and never placed in URL query strings or browser localStorage.'}
            </li>
            <li>
              <strong>{isRtl ? 'التحقق التشفيري من البوتات والدفع:' : 'Cryptographic Webhook Verification:'}</strong>{' '}
              {isRtl
                ? 'طلبات ديسكورد محمية بتوقيع Ed25519، وتيلغرام برمز X-Telegram-Bot-Api-Secret-Token، ومدفوعات Whop بتوقيع HMAC.'
                : 'Discord interactions verify Ed25519 signatures, Telegram webhooks enforce secret token headers, and Whop billing updates verify webhook signatures.'}
            </li>
            <li>
              <strong>{isRtl ? 'تواصل الدعم والخصوصية:' : 'Privacy Requests:'}</strong>{' '}
              {isRtl
                ? 'يمكنك تصدير بياناتك بصيغة JSON من الأعلى في أي وقت أو طلب إزالة ربط منصاتك من إعدادات الحساب.'
                : 'Use the JSON export button above anytime or unlink connected accounts instantly from Account Settings.'}
            </li>
          </ul>
        </article>
      </div>
    </div>
  );
};
