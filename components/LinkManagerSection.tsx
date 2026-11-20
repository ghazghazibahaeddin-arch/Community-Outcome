'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { translations } from '@/lib/i18n';
import { CommunityLink, LinkType, Community, User, Language, UserRole } from '@/lib/types';
import { ExternalLink, Plus, Copy, Check, Ban, Clock, Users } from 'lucide-react';

interface LinkManagerSectionProps {
  links: CommunityLink[];
  community: Community;
  currentUser: User;
  lang: Language;
  onRefresh: () => void;
}

const ALL_LINK_TYPES: { type: LinkType; label: string; labelAr: string; desc: string }[] = [
  { type: 'hub_multipurpose', label: 'Main Community Hub Link (ALT-6)', labelAr: 'الرابط الشامل للمجتمع (ALT-6)', desc: 'Multipurpose role-aware routing link for members and visitors.' },
  { type: 'link_1_ranking', label: 'Link-1: Valuable Contribution Ranking', labelAr: 'رابط 1: تصنيف المساهمات القيّمة', desc: 'Transparent view of configured contribution categories and rankings.' },
  { type: 'link_3_thanks', label: 'Link-3: Contribution-Linked Thanks', labelAr: 'رابط 3: شكر وتزكية مرتبطة بالمساهمة', desc: 'Thank contributors for specific verified outcomes without cash.' },
  { type: 'link_4_confirmable', label: 'Link-4: Confirmable Contribution Record', labelAr: 'رابط 4: سجل مساهمة قابل للتأكيد الثنائي', desc: 'Dual-party confirmation link with evidence audit.' },
  { type: 'link_5_portable_card', label: 'Link-5: Portable Contributor Card', labelAr: 'رابط 5: بطاقة المساهم المحمولة', desc: 'Share an individual contribution between communities.' },
  { type: 'link_6_owner_dashboard', label: 'Link-6: Owner Dashboard Link', labelAr: 'رابط 6: رابط لوحة تحكم المالك', desc: 'Authorized administrative link for community managers.' },
  { type: 'link_7_bounties', label: 'Link-7: Community Bounties', labelAr: 'رابط 7: مهام ومكافآت التقدير', desc: 'Non-monetary challenge opportunities with recognition.' },
  { type: 'link_8_approval_rules', label: 'Link-8: Approval and Dispute Rules', labelAr: 'رابط 8: قواعد الاعتماد والنزاعات', desc: 'Transparent review criteria, permissions and appeal paths.' },
  { type: 'link_9_help_request', label: 'Link-9: Short Help Request Form', labelAr: 'رابط 9: نموذج طلب مساعدة سريع', desc: 'Direct form to submit structured NeedSignal requests.' },
  { type: 'link_10_service_offer', label: 'Link-10: Skill or Service Offer Card', labelAr: 'رابط 10: بطاقة تقديم خدمة أو خبرة', desc: 'Present available skills and volunteer offers.' },
  { type: 'link_11_booking', label: 'Link-11: Lightweight Appointment Booking', labelAr: 'رابط 11: حجز موعد استشاري مبسط', desc: 'Consultation slot scheduling without payments.' },
  { type: 'link_12_rsvp', label: 'Link-12: Community Event RSVP', labelAr: 'رابط 12: تأكيد حضور الفعاليات', desc: 'Register attendance intentions for community events.' },
  { type: 'link_13_checklist', label: 'Link-13: Execution Checklist', labelAr: 'رابط 13: قائمة التحقق التنفيذية', desc: 'Trackable milestone checklist for plan participants.' },
  { type: 'link_14_evidence', label: 'Link-14: Contribution Evidence Submission', labelAr: 'رابط 14: رفع أدلة الإنجاز', desc: 'Direct link to submit verifiable deliverable proofs.' },
  { type: 'link_15_decision', label: 'Link-15: Contribution Decision & Polls', labelAr: 'رابط 15: قرارات المراجعة والتصويت', desc: 'Reviewer-only link to approve or reject submissions and run polls.' },
  { type: 'link_16_knowledge_source', label: 'Link-16: Trusted Knowledge Source Card', labelAr: 'رابط 16: بطاقة معرفة بمصادر موثقة', desc: 'Verified answer or recommendation with primary citations.' },
  { type: 'link_17_onboarding', label: 'Link-17: Role-Based Onboarding Link', labelAr: 'رابط 17: تأهيل الأعضاء حسب الدور', desc: 'Direct journey selector for new members, experts, or moderators.' },
  { type: 'link_18_task_card', label: 'Link-18: Task or Bounty Card', labelAr: 'رابط 18: بطاقة مهمة محددة', desc: 'Shareable card with task acceptance criteria.' },
  { type: 'link_19_status_update', label: 'Link-19: Manual Request Status Update', labelAr: 'رابط 19: تحديث حالة الطلب يدوياً', desc: 'Unified single-page status updater for requests.' },
  { type: 'link_20_multi_community', label: 'Link-20: Multi-Community Help Request', labelAr: 'رابط 20: طلب مساعدة عابر للمجتمعات', desc: 'Partner-network help sharing link.' },
  { type: 'link_21_attendance', label: 'Link-21: Attendance or Activity Confirmation', labelAr: 'رابط 21: تأكيد الحضور الفعلي', desc: 'Independent confirmation of actual event participation.' },
  { type: 'link_22_single_contribution', label: 'Link-22: Single Contribution Public Card', labelAr: 'رابط 22: بطاقة مساهمة عامة موثقة', desc: 'Shareable card for one authorized deliverable.' },
  { type: 'link_23_referral', label: 'Link-23: Referral Attribution', labelAr: 'رابط 23: رابط دعوة وإحالة موثق', desc: 'Attributed community invitation with conversion tracking.' },
  { type: 'link_24_issue_report', label: 'Link-24: Issue Reporting', labelAr: 'رابط 24: الإبلاغ عن مشكلة أو نزاع', desc: 'Report an issue with community resources or tasks.' },
  { type: 'link_25_audience_expiry', label: 'Link-25: Link Audience and Expiration', labelAr: 'رابط 25: رابط محدد بالجمهور والمدة', desc: 'Time-limited, role-restricted secure link.' },
  { type: 'link_26_outcome_report', label: 'Link-26: Owner Outcome Report', labelAr: 'رابط 26: تقرير نتائج المالك', desc: 'Concise executive summary of results produced via links.' }
];

export const LinkManagerSection: React.FC<LinkManagerSectionProps> = ({
  links,
  community,
  lang,
  onRefresh
}) => {
  const t = translations[lang];
  const isRtl = lang === 'ar';

  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(0);

  useEffect(() => {
    const timer = setTimeout(() => setNowMs(Date.now()), 0);
    return () => clearTimeout(timer);
  }, []);

  // Link Form
  const [selectedType, setSelectedType] = useState<LinkType>('link_9_help_request');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkDesc, setLinkDesc] = useState('');
  const [linkSlug, setLinkSlug] = useState('');
  const [linkAudience, setLinkAudience] = useState<CommunityLink['audience']>('public');
  const [requiredRole, setRequiredRole] = useState<UserRole>('reviewer');
  const [expiresAt, setExpiresAt] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [targetEntityId, setTargetEntityId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkTitle.trim() || !linkSlug.trim()) return;
    setFeedback(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'create_link',
          payload: {
            communityId: community.id,
            linkType: selectedType,
            slug: linkSlug.toLowerCase().replace(/\s+/g, '-'),
            title: linkTitle.trim(),
            description: linkDesc.trim(),
            audience: linkAudience,
            requiredRole: linkAudience === 'role_restricted' ? requiredRole : undefined,
            expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
            maxUses: maxUses ? Number(maxUses) : undefined,
            targetEntityId: targetEntityId.trim() || undefined
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', text: data.error || (isRtl ? 'فشل إنشاء رابط الإجراء.' : 'Failed to create action link.') });
        return;
      }
      setIsCreatingLink(false);
      setLinkTitle('');
      setLinkDesc('');
      setLinkSlug('');
      setExpiresAt('');
      setMaxUses('');
      setTargetEntityId('');
      setFeedback({ type: 'success', text: isRtl ? `تم إنشاء الرابط /l/${data.result?.slug || ''}` : `Action link /l/${data.result?.slug || ''} created cleanly.` });
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Network error creating action link.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (linkId: string) => {
    setFeedback(null);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'revoke_link',
          payload: { linkId }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', text: data.error || 'Failed to revoke action link.' });
        return;
      }
      setConfirmRevokeId(null);
      setFeedback({ type: 'success', text: isRtl ? 'تم إلغاء تفعيل الرابط.' : 'Action link revoked.' });
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Network error revoking link.' });
    }
  };

  const handleCopy = async (slug: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://community-outcome.ghazghazibahaeddin.workers.dev';
    const url = `${origin}/l/${slug}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopiedSlug(slug);
        setTimeout(() => setCopiedSlug(null), 2500);
      } else {
        setFeedback({ type: 'error', text: `Copy URL manually: ${url}` });
      }
    } catch {
      setFeedback({ type: 'error', text: `Clipboard restricted. Share URL: ${url}` });
    }
  };

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-6">
      {feedback && (
        <div
          className={`rounded-xl border p-3 text-xs flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
              : 'border-rose-500/40 bg-rose-950/40 text-rose-300'
          }`}
        >
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white px-1">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white">{t.links.title}</h2>
          <p className="text-xs text-slate-400">{t.links.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreatingLink(true)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t.links.createLink}</span>
        </button>
      </div>

      {/* Create Link Drawer */}
      {isCreatingLink && (
        <form onSubmit={handleCreateLink} className="rounded-xl border border-slate-700 bg-slate-800/60 p-5 space-y-4">
          <h4 className="text-xs font-bold text-white">
            {isRtl ? 'إعداد رابط إجراء مجتمعي جديد' : 'Configure New Community Action URL'}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">
                {isRtl ? 'نوع الرابط' : 'Link Concept'} <span className="text-rose-400">*</span>
              </label>
              <select
                value={selectedType}
                onChange={(e) => {
                  const tType = e.target.value as LinkType;
                  setSelectedType(tType);
                  const found = ALL_LINK_TYPES.find((l) => l.type === tType);
                  if (found) {
                    setLinkTitle(isRtl ? found.labelAr : found.label);
                    setLinkDesc(found.desc);
                    setLinkSlug(found.type.replace(/_/g, '-'));
                  }
                }}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
              >
                {ALL_LINK_TYPES.map((l) => (
                  <option key={l.type} value={l.type}>
                    {isRtl ? l.labelAr : l.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-300 block mb-1">
                {isRtl ? 'نطاق الجمهور' : 'Audience Scope'}
              </label>
              <select
                value={linkAudience}
                onChange={(e) => setLinkAudience(e.target.value as any)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
              >
                <option value="public">{isRtl ? 'عام (أي شخص لديه الرابط)' : 'Public (Anyone with link)'}</option>
                <option value="members_only">{isRtl ? 'الأعضاء فقط' : 'Members Only'}</option>
                <option value="role_restricted">{isRtl ? 'مقيد بدور محدد' : 'Role Restricted'}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">
                {isRtl ? 'عنوان الرابط' : 'Link Title'} <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="e.g. Volunteer Assistance Form"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">
                {isRtl ? 'المسار المخصص (Slug)' : 'Custom Slug (Action Path)'} <span className="text-rose-400">*</span>
              </label>
              <div className="flex items-center" dir="ltr">
                <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1.5 border border-r-0 border-slate-700 rounded-l-md font-mono">
                  /l/
                </span>
                <input
                  type="text"
                  required
                  value={linkSlug}
                  onChange={(e) => setLinkSlug(e.target.value)}
                  placeholder="volunteer-form"
                  className="w-full rounded-r-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">
                {isRtl ? 'تاريخ الانتهاء (اختياري)' : 'Expires At (Optional)'}
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">
                {isRtl ? 'الحد الأقصى للاستخدام (اختياري)' : 'Max Uses (Optional)'}
              </label>
              <input
                type="number"
                min={1}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="e.g. 25"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            {linkAudience === 'role_restricted' ? (
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">
                  {isRtl ? 'الدور المطلوب' : 'Required Role'}
                </label>
                <select
                  value={requiredRole}
                  onChange={(e) => setRequiredRole(e.target.value as UserRole)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="reviewer">Reviewer</option>
                  <option value="moderator">Moderator</option>
                  <option value="task_manager">Task Manager</option>
                  <option value="event_organizer">Event Organizer</option>
                  <option value="admin">Admin</option>
                  <option value="community_owner">Community Owner</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">
                  {isRtl ? 'معرف العنصر المستهدف (اختياري)' : 'Target Entity ID (Optional)'}
                </label>
                <input
                  type="text"
                  value={targetEntityId}
                  onChange={(e) => setTargetEntityId(e.target.value)}
                  placeholder="tsk_01 / cnt_01"
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-[11px] text-slate-300 block mb-1">
              {isRtl ? 'الوصف' : 'Description'}
            </label>
            <input
              type="text"
              value={linkDesc}
              onChange={(e) => setLinkDesc(e.target.value)}
              placeholder="Context displayed when link is shared in Discord or Telegram embed"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreatingLink(false)}
              className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {isSubmitting ? (isRtl ? 'جاري الإنشاء...' : 'Generating...') : isRtl ? 'توليد الرابط' : 'Generate Link'}
            </button>
          </div>
        </form>
      )}

      {/* Link Inventory & Metric Tracking */}
      <div className="space-y-3">
        {links.map((link) => {
          const typeDef = ALL_LINK_TYPES.find((item) => item.type === link.linkType);
          const isCopied = copiedSlug === link.slug;
          const isExpired = Boolean(nowMs > 0 && link.expiresAt && new Date(link.expiresAt).getTime() <= nowMs);
          return (
            <div
              key={link.id}
              className={`rounded-xl border p-4 transition-all ${
                link.isRevoked || isExpired
                  ? 'border-slate-800/50 bg-slate-950/40 opacity-65'
                  : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{link.title}</h3>
                    <span className="text-xs text-slate-500 font-mono" dir="ltr">
                      /l/{link.slug}
                    </span>
                    <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/50 border border-indigo-500/20 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                      <Users className="h-2.5 w-2.5" />
                      {link.audience}
                    </span>
                    {link.expiresAt && (
                      <span className="text-[10px] font-mono text-amber-300 bg-amber-950/40 border border-amber-500/20 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {isExpired ? (isRtl ? 'منتهي' : 'Expired') : new Date(link.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                    {link.isRevoked && (
                      <span className="text-[10px] font-mono text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded">
                        {isRtl ? 'ملغى' : 'Revoked'}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{link.description || typeDef?.desc}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!link.isRevoked && !isExpired && (
                    <Link
                      href={`/l/${link.slug}`}
                      className="flex items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-600/20 px-2.5 py-1.5 text-xs text-indigo-200 hover:bg-indigo-600/30 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>{isRtl ? 'فتح' : 'Open'}</span>
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCopy(link.slug)}
                    className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 hover:text-white transition-colors"
                  >
                    {isCopied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{isCopied ? (isRtl ? 'تم النسخ' : 'Copied') : isRtl ? 'نسخ الرابط' : 'Copy URL'}</span>
                  </button>

                  {!link.isRevoked &&
                    (confirmRevokeId === link.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleRevoke(link.id)}
                          className="rounded-md bg-rose-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-rose-500"
                        >
                          {isRtl ? 'تأكيد الإلغاء' : 'Confirm'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRevokeId(null)}
                          className="rounded-md border border-slate-700 px-2 py-1 text-[10px] text-slate-400 hover:text-white"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmRevokeId(link.id)}
                        title={isRtl ? 'إلغاء تفعيل الرابط' : 'Revoke Link'}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-800 bg-slate-900 text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                    ))}
                </div>
              </div>

              {/* Real Metric Funnel Tracker */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3 border-t border-slate-800/80 text-xs">
                <div className="p-2 rounded bg-slate-950/40">
                  <span className="text-[10px] text-slate-500 uppercase block">{t.links.visits}</span>
                  <span className="text-sm font-bold font-mono text-white tabular-nums">{link.stats.visits}</span>
                </div>
                <div className="p-2 rounded bg-slate-950/40">
                  <span className="text-[10px] text-slate-500 uppercase block">{t.links.starts}</span>
                  <span className="text-sm font-bold font-mono text-slate-300 tabular-nums">{link.stats.starts}</span>
                </div>
                <div className="p-2 rounded bg-slate-950/40">
                  <span className="text-[10px] text-slate-500 uppercase block">{t.links.submissions}</span>
                  <span className="text-sm font-bold font-mono text-indigo-400 tabular-nums">{link.stats.submissions}</span>
                </div>
                <div className="p-2 rounded bg-slate-950/40">
                  <span className="text-[10px] text-slate-500 uppercase block">{t.common.completed}</span>
                  <span className="text-sm font-bold font-mono text-sky-400 tabular-nums">{link.stats.completions}</span>
                </div>
                <div className="col-span-2 sm:col-span-1 p-2 rounded bg-slate-950/40">
                  <span className="text-[10px] text-slate-500 uppercase block">{t.links.verifiedOutcomes}</span>
                  <span className="text-sm font-bold font-mono text-emerald-400 tabular-nums">{link.stats.verifiedOutcomes}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
