'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Community,
  CommunityEvent,
  CommunityLink,
  Contribution,
  Dispute,
  ExpertProfile,
  KnowledgeArticle,
  Language,
  NeedSignalRequest,
  Offer,
  OutcomeRecord,
  PlanTask,
  Poll,
  User,
  Appointment
} from '@/lib/types';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Crown,
  ExternalLink,
  Flag,
  Globe,
  HandHelping,
  HeartHandshake,
  Layers,
  Lock,
  MessageSquarePlus,
  Plus,
  Send,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  Vote,
  Zap
} from 'lucide-react';

export interface ActionLinkViewProps {
  link: CommunityLink;
  community: Community;
  communities: Community[];
  authUser: User | null;
  users: User[];
  requests: NeedSignalRequest[];
  offers: Offer[];
  tasks: PlanTask[];
  contributions: Contribution[];
  disputes: Dispute[];
  events: CommunityEvent[];
  polls: Poll[];
  knowledge: KnowledgeArticle[];
  outcomes: OutcomeRecord[];
  expertProfiles: ExpertProfile[];
  appointments: Appointment[];
  lang: Language;
  returnToUrl: string;
  onAction: (action: string, payload: Record<string, any>, successMsg: string) => Promise<boolean>;
  onRecordCompletion: () => Promise<void>;
}

const GuestAuthNotice: React.FC<{ authUser: User | null; isRtl: boolean; returnToUrl: string }> = ({
  authUser,
  isRtl,
  returnToUrl
}) =>
  authUser ? null : (
    <div className="rounded-xl border border-amber-500/30 bg-amber-950/25 p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
      <span className="text-amber-200">
        {isRtl
          ? 'سجل الدخول لإرسال البيانات وحفظ الإجراءات باسمك وتوثيقها في السجل.'
          : 'Sign in to submit actions under your verified member identity.'}
      </span>
      <Link
        href={`/auth/login?returnTo=${encodeURIComponent(returnToUrl)}`}
        className="rounded-md bg-amber-500/20 border border-amber-400/40 px-3 py-1 font-semibold text-amber-200 hover:bg-amber-500/30"
      >
        {isRtl ? 'تسجيل الدخول' : 'Sign In'}
      </Link>
    </div>
  );

export const ActionLinkViews: React.FC<ActionLinkViewProps> = ({
  link,
  community,
  communities,
  authUser,
  users,
  requests,
  offers,
  tasks,
  contributions,
  disputes,
  events,
  polls,
  knowledge,
  outcomes,
  expertProfiles,
  appointments,
  lang,
  returnToUrl,
  onAction,
  onRecordCompletion
}) => {
  const isRtl = lang === 'ar';
  const [busyId, setBusyId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(0);

  useEffect(() => {
    const timer = setTimeout(() => setNowMs(Date.now()), 0);
    return () => clearTimeout(timer);
  }, []);

  // Shared helper to map userId -> User
  const userMap = useMemo(() => {
    const map = new Map<string, User>();
    users.forEach((u) => map.set(u.id, u));
    return map;
  }, [users]);

  const isOwnerOrStaff = useMemo(() => {
    if (!authUser) return false;
    return authUser.platformRole === 'platform_admin' || community.ownerId === authUser.id;
  }, [authUser, community.ownerId]);

  const openRequests = useMemo(
    () => requests.filter((r) => ['open', 'receiving_offers', 'in_progress'].includes(r.status)),
    [requests]
  );
  const activeTasks = useMemo(() => tasks.filter((t) => t.status !== 'completed'), [tasks]);

  // --- Local form states scoped cleanly ---
  // Requests / Offers
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqPriority, setReqPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [offerReqId, setOfferReqId] = useState<string | null>(null);
  const [offerText, setOfferText] = useState('');
  const [offerTimeline, setOfferTimeline] = useState('2-3 days');

  // Task / Contribution Evidence
  const [selectedTaskId, setSelectedTaskId] = useState<string>(activeTasks[0]?.id || '');
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('https://github.com/');
  const [evidenceDesc, setEvidenceDesc] = useState('');

  // Thanks / Endorsement
  const [endorseUserId, setEndorseUserId] = useState<string>(
    users.find((u) => u.id !== authUser?.id)?.id || users[0]?.id || ''
  );
  const [endorseSkill, setEndorseSkill] = useState('System Architecture');

  // Booking
  const [selectedExpertId, setSelectedExpertId] = useState<string>(expertProfiles[0]?.id || '');
  const [bookingSlot, setBookingSlot] = useState<string>(expertProfiles[0]?.availableSlots?.[0] || 'Thursday 16:00 UTC');
  const [bookingTopic, setBookingTopic] = useState('');

  // Review & Dispute
  const [reviewReasons, setReviewReasons] = useState<Record<string, string>>({});
  const [disputeContribId, setDisputeContribId] = useState<string>(contributions[0]?.id || '');
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeEvidence, setDisputeEvidence] = useState('');
  const [appealNotes, setAppealNotes] = useState<Record<string, string>>({});

  // Invite & Onboarding
  const [inviteCode, setInviteCode] = useState('');
  const [acceptedRules, setAcceptedRules] = useState(false);

  // Knowledge
  const [knwTitle, setKnwTitle] = useState('');
  const [knwContent, setKnwContent] = useState('');
  const [knwSourceUrl, setKnwSourceUrl] = useState('');

  // Status update
  const [statusNotes, setStatusNotes] = useState<Record<string, string>>({});

  const runBusy = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    try {
      await fn();
    } finally {
      setBusyId(null);
    }
  };

  // =========================================================================
  // 1. RANKING (link_1_ranking)
  // =========================================================================
  if (link.linkType === 'link_1_ranking') {
    const verifiedByMember = users
      .map((u) => {
        const verifiedCount = contributions.filter((c) => c.memberId === u.id && c.reviewStatus === 'verified').length;
        const verifiedSkills = (u.passport?.skills || []).filter((s) => s.verified).length;
        const endorsements = (u.passport?.skills || []).reduce((acc, s) => acc + (s.endorsementsCount || 0), 0);
        return { user: u, verifiedCount, verifiedSkills, endorsements, score: verifiedCount * 10 + verifiedSkills * 3 + endorsements };
      })
      .sort((a, b) => b.score - a.score);

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(community.contributionCategories || []).map((cat) => (
            <div key={cat.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-white">{isRtl && cat.nameAr ? cat.nameAr : cat.name}</span>
                <span className="text-[10px] font-mono rounded border border-indigo-500/30 bg-indigo-950/50 px-1.5 py-0.5 text-indigo-300">
                  {cat.requiresReview ? (isRtl ? 'يتطلب مراجعة' : 'Peer Review') : (isRtl ? 'مباشر' : 'Direct')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">{cat.description}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {isRtl ? 'تصنيف المساهمين المعتمدين' : 'Verified Contributor Standing'}
          </h3>
          {verifiedByMember.map((row, idx) => (
            <div
              key={row.user.id}
              className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="h-7 w-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold font-mono text-indigo-300">
                  #{idx + 1}
                </span>
                <div>
                  <Link href={`/p/${row.user.id}`} className="text-xs font-bold text-white hover:text-indigo-300">
                    {row.user.name}
                  </Link>
                  <div className="text-[11px] text-slate-400">
                    {row.verifiedCount} {isRtl ? 'مساهمات موثقة' : 'verified deliverables'} · {row.endorsements}{' '}
                    {isRtl ? 'تزكيات' : 'endorsements'}
                  </div>
                </div>
              </div>
              <span className="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-xs font-mono font-bold text-emerald-300">
                {row.score} pts
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. CONTRIBUTION-LINKED THANKS (link_3_thanks)
  // =========================================================================
  if (link.linkType === 'link_3_thanks') {
    const eligibleUsers = users.filter((u) => u.id !== authUser?.id);
    return (
      <div className="space-y-4">
        <GuestAuthNotice authUser={authUser} isRtl={isRtl} returnToUrl={returnToUrl} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!endorseUserId || !endorseSkill.trim()) return;
            runBusy('endorse', async () => {
              const ok = await onAction(
                'endorse_member_skill',
                { targetUserId: endorseUserId, skillName: endorseSkill.trim(), communityId: community.id },
                isRtl ? 'تم إرسال الشكر وتزكية المهارة بنجاح!' : 'Appreciation and skill endorsement recorded!'
              );
              if (ok) await onRecordCompletion();
            });
          }}
          className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
            <HeartHandshake className="h-4 w-4" />
            <span>{isRtl ? 'تقديم شكر وتزكية مهارة موثقة' : 'Send Contribution Thanks & Skill Endorsement'}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">
                {isRtl ? 'العضو المكرم' : 'Contributor'} <span className="text-rose-400">*</span>
              </label>
              <select
                value={endorseUserId}
                onChange={(e) => setEndorseUserId(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
              >
                {eligibleUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">
                {isRtl ? 'المهارة الموثقة' : 'Skill Demonstrated'} <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={endorseSkill}
                onChange={(e) => setEndorseSkill(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                placeholder="e.g. Security Audits, React"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={busyId === 'endorse' || !authUser}
              className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
            >
              <HeartHandshake className="h-3.5 w-3.5" />
              <span>{busyId === 'endorse' ? (isRtl ? 'جاري الإرسال...' : 'Sending...') : isRtl ? 'تزكية وشكر' : 'Send Appreciation'}</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  // =========================================================================
  // 3. CONFIRMABLE CONTRIBUTION RECORD (link_4_confirmable)
  // =========================================================================
  if (link.linkType === 'link_4_confirmable') {
    const list = link.targetEntityId
      ? contributions.filter((c) => c.id === link.targetEntityId)
      : contributions.slice(0, 8);
    return (
      <div className="space-y-3">
        <GuestAuthNotice authUser={authUser} isRtl={isRtl} returnToUrl={returnToUrl} />
        {list.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">{isRtl ? 'لا توجد مساهمات للتأكيد حالياً.' : 'No contribution records available.'}</p>
        ) : (
          list.map((cnt) => {
            const author = userMap.get(cnt.memberId);
            const canSecondPartyConfirm = Boolean(authUser && authUser.id !== cnt.memberId && !cnt.secondPartyConfirmed);
            return (
              <div key={cnt.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">{cnt.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{cnt.description}</p>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-mono uppercase ${
                      cnt.secondPartyConfirmed
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {cnt.secondPartyConfirmed ? (isRtl ? 'تأكيد ثنائي مكتمل' : 'Dual Confirmed') : (isRtl ? 'بانتظار الطرف الثاني' : 'Awaiting 2nd Party')}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span>
                    {isRtl ? 'المساهم:' : 'Contributor:'} <strong className="text-slate-200">{author?.name || cnt.memberId}</strong> ·{' '}
                    {cnt.evidence[0]?.url && (
                      <a href={cnt.evidence[0].url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                        {isRtl ? 'الدليل المرفق' : 'Evidence'}
                      </a>
                    )}
                  </span>
                  {canSecondPartyConfirm && (
                    <button
                      type="button"
                      disabled={busyId === cnt.id}
                      onClick={() =>
                        runBusy(cnt.id, async () => {
                          const ok = await onAction(
                            'confirm_contribution_second_party',
                            { contributionId: cnt.id, note: statusNotes[cnt.id] || 'Confirmed via Action Link' },
                            isRtl ? 'تم تسجيل تأكيد الطرف الثاني بنجاح.' : 'Second-party outcome confirmation saved!'
                          );
                          if (ok) await onRecordCompletion();
                        })
                      }
                      className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {busyId === cnt.id ? '...' : isRtl ? 'تأكيد كطرف ثانٍ' : 'Confirm Outcome (2nd Party)'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  // =========================================================================
  // 4. PORTABLE CONTRIBUTOR CARD (link_5_portable_card)
  // =========================================================================
  if (link.linkType === 'link_5_portable_card') {
    const targetUsers = link.targetEntityId ? users.filter((u) => u.id === link.targetEntityId) : users;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {targetUsers.map((u) => {
          const isPublic = u.passport?.isPublic !== false;
          const skills = (u.passport?.skills || []).filter((s) => !u.privacy?.showVerifiedOnly || s.verified);
          const verifiedCount = contributions.filter((c) => c.memberId === u.id && c.reviewStatus === 'verified').length;
          return (
            <div key={u.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">{u.passport?.displayName || u.name}</h3>
                  <span className="text-[11px] font-mono text-emerald-400">
                    {verifiedCount} {isRtl ? 'نتائج موثقة' : 'Verified Deliverables'}
                  </span>
                </div>
                {isPublic ? (
                  <Link
                    href={`/p/${u.id}`}
                    className="inline-flex items-center gap-1 rounded-md bg-indigo-600/25 border border-indigo-500/40 px-2.5 py-1 text-[11px] font-semibold text-indigo-200 hover:bg-indigo-600/40"
                  >
                    <span>{isRtl ? 'عرض الجواز' : 'Passport'}</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
                    <Lock className="h-3 w-3" /> {isRtl ? 'خاص' : 'Private'}
                  </span>
                )}
              </div>
              {u.privacy?.showBio !== false && u.passport?.biography && (
                <p className="text-xs text-slate-400 line-clamp-2">{u.passport.biography}</p>
              )}
              {u.privacy?.showSkills !== false && skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {skills.slice(0, 5).map((s, idx) => (
                    <span
                      key={idx}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-300"
                    >
                      {s.verified ? '✓ ' : ''}
                      {s.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // =========================================================================
  // 5. OWNER EXECUTIVE DASHBOARD (link_6_owner_dashboard)
  // =========================================================================
  if (link.linkType === 'link_6_owner_dashboard') {
    const pendingReviews = contributions.filter((c) => c.reviewStatus === 'pending');
    const openDisputes = disputes.filter((d) => d.status === 'open' || d.status === 'appealed');
    return (
      <div className="space-y-4">
        <GuestAuthNotice authUser={authUser} isRtl={isRtl} returnToUrl={returnToUrl} />
        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="text-lg font-bold font-mono text-amber-300">{pendingReviews.length}</div>
            <div className="text-[11px] text-slate-400">{isRtl ? 'مراجعات معلقة' : 'Pending Reviews'}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="text-lg font-bold font-mono text-rose-300">{openDisputes.length}</div>
            <div className="text-[11px] text-slate-400">{isRtl ? 'نزاعات مفتوحة' : 'Active Disputes'}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="text-lg font-bold font-mono text-indigo-300">{openRequests.length}</div>
            <div className="text-[11px] text-slate-400">{isRtl ? 'طلبات مفتوحة' : 'Open Requests'}</div>
          </div>
        </div>

        {!isOwnerOrStaff && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-950/25 p-3 text-xs text-rose-200 flex items-center gap-2">
            <Crown className="h-4 w-4 shrink-0" />
            <span>
              {isRtl
                ? 'تنفيذ قرارات الإدارة متاح فقط لمالك المجتمع أو المشرفين المعتمدين.'
                : 'Governance review approvals require Community Owner or Staff credentials.'}
            </span>
          </div>
        )}

        {pendingReviews.map((cnt) => (
          <div key={cnt.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-white">{cnt.title}</span>
              <span className="text-[10px] font-mono text-amber-300">{cnt.reviewStatus}</span>
            </div>
            <input
              type="text"
              value={reviewReasons[cnt.id] || ''}
              onChange={(e) => setReviewReasons((p) => ({ ...p, [cnt.id]: e.target.value }))}
              placeholder={isRtl ? 'سبب القرار أو ملاحظات المراجعة (إلزامي)...' : 'Mandatory review reason / feedback...'}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
            />
            <div className="flex flex-wrap gap-2">
              {(['verified', 'revision_requested', 'rejected'] as const).map((dec) => (
                <button
                  key={dec}
                  type="button"
                  disabled={!isOwnerOrStaff || busyId === `${cnt.id}_${dec}`}
                  onClick={() =>
                    runBusy(`${cnt.id}_${dec}`, async () => {
                      await onAction(
                        'review_contribution',
                        {
                          contributionId: cnt.id,
                          decision: dec,
                          reason: reviewReasons[cnt.id] || `Marked ${dec} via Owner Action Link`
                        },
                        isRtl ? 'تم حفظ قرار المراجعة.' : `Contribution marked ${dec}.`
                      );
                    })
                  }
                  className={`rounded-md px-3 py-1 text-xs font-semibold text-white disabled:opacity-40 ${
                    dec === 'verified'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : dec === 'revision_requested'
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {dec.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // =========================================================================
  // 6. BOUNTIES (link_7_bounties)
  // =========================================================================
  if (link.linkType === 'link_7_bounties') {
    const bounties = activeTasks.filter((t) => !t.assigneeId || t.assigneeId === authUser?.id);
    return (
      <div className="space-y-3">
        <GuestAuthNotice authUser={authUser} isRtl={isRtl} returnToUrl={returnToUrl} />
        {bounties.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            {isRtl ? 'لا توجد مكافآت مهام مفتوحة حالياً.' : 'All community recognition bounties are currently claimed or completed.'}
          </p>
        ) : (
          bounties.map((b) => (
            <div key={b.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">{b.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{b.description}</p>
                </div>
                <span className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono text-amber-300">
                  {b.rewardRecognition || (isRtl ? 'شهادة إنجاز' : 'Recognition Credit')}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 pt-1">
                <span>
                  {isRtl ? 'الاستحقاق:' : 'Due:'} {new Date(b.deadline).toLocaleDateString()}
                </span>
                {!b.assigneeId ? (
                  <button
                    type="button"
                    disabled={!authUser || busyId === b.id}
                    onClick={() =>
                      runBusy(b.id, async () => {
                        const ok = await onAction(
                          'claim_task',
                          { taskId: b.id },
                          isRtl ? 'تم حجز المهمة بنجاح!' : `Claimed bounty "${b.title}"!`
                        );
                        if (ok) await onRecordCompletion();
                      })
                    }
                    className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
                  >
                    {busyId === b.id ? '...' : isRtl ? 'تولي المكافأة' : 'Claim Bounty'}
                  </button>
                ) : (
                  <span className="text-emerald-400 font-semibold">{isRtl ? 'محجوزة لك' : 'Claimed by You'}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  // =========================================================================
  // 7. APPROVAL & DISPUTE RULES (link_8_approval_rules)
  // =========================================================================
  if (link.linkType === 'link_8_approval_rules') {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            <span>{isRtl ? 'ميثاق المجتمع وقواعد الاعتماد' : 'Community Charter & Verification Rules'}</span>
          </h3>
          <ul className="space-y-1.5 text-xs text-slate-300 list-disc ps-5">
            {(community.rules || []).map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
            {isRtl
              ? 'الحد الأدنى للمراجعة من الأقران: يجب إرفاق رابط دليل عام صالح (HTTP/HTTPS). القرارات الموثقة لا تتغير إلا عبر نزاع Community Shield.'
              : `Minimum Peer Reviews: ${community.settings?.minPeerReviews ?? 1}. Valid public evidence URL required. Verified records are immutable outside formal Community Shield disputes.`}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {(community.contributionCategories || []).map((cat) => (
            <div key={cat.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-1">
              <div className="text-xs font-bold text-white">{isRtl && cat.nameAr ? cat.nameAr : cat.name}</div>
              <div className="text-[11px] text-slate-400">{cat.description}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 8. SHORT HELP REQUEST FORM (link_9_help_request)
  // =========================================================================
  if (link.linkType === 'link_9_help_request') {
    return (
      <div className="space-y-4">
        <GuestAuthNotice authUser={authUser} isRtl={isRtl} returnToUrl={returnToUrl} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!reqTitle.trim()) return;
            runBusy('create_req', async () => {
              const ok = await onAction(
                'create_request',
                {
                  communityId: community.id,
                  title: reqTitle.trim(),
                  description: reqDesc.trim() || reqTitle.trim(),
                  category: community.contributionCategories?.[0]?.id || 'cat_core',
                  skillsRequired: ['Collaboration'],
                  priority: reqPriority,
                  deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
                  status: 'open',
                  visibility: 'community'
                },
                isRtl ? 'تم نشر طلب المساعدة وتحديث القنوات!' : 'NeedSignal help request published!'
              );
              if (ok) {
                setReqTitle('');
                setReqDesc('');
                await onRecordCompletion();
              }
            });
          }}
          className="rounded-xl border border-indigo-500/30 bg-slate-950/70 p-4 space-y-3"
        >
          <h3 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
            <MessageSquarePlus className="h-4 w-4" />
            <span>{isRtl ? 'إرسال طلب مساعدة منظم (NeedSignal)' : 'Submit Structured NeedSignal Help Request'}</span>
          </h3>
          <div>
            <label className="block text-[11px] text-slate-300 mb-1">
              {isRtl ? 'عنوان الطلب' : 'Request Title'} <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={reqTitle}
              onChange={(e) => setReqTitle(e.target.value)}
              placeholder={isRtl ? 'مثال: مراجعة أمان نقاط Webhook' : 'e.g., Audit webhook payload verification'}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              value={reqDesc}
              onChange={(e) => setReqDesc(e.target.value)}
              placeholder={isRtl ? 'التفاصيل والمخرجات المطلوبة...' : 'Expected deliverable & context...'}
              className="sm:col-span-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
            />
            <select
              value={reqPriority}
              onChange={(e) => setReqPriority(e.target.value as any)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-white"
            >
              <option value="low">{isRtl ? 'أولوية منخفضة' : 'Low Priority'}</option>
              <option value="medium">{isRtl ? 'أولوية متوسطة' : 'Medium Priority'}</option>
              <option value="high">{isRtl ? 'أولوية عالية' : 'High Priority'}</option>
              <option value="urgent">{isRtl ? 'عاجل' : 'Urgent'}</option>
            </select>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!authUser || busyId === 'create_req'}
              className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
            >
              {busyId === 'create_req' ? '...' : isRtl ? 'نشر الطلب' : 'Publish Request'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // =========================================================================
  // 9. SERVICE OFFER CARD (link_10_service_offer)
  // =========================================================================
  if (link.linkType === 'link_10_service_offer') {
    return (
      <div className="space-y-4">
        <GuestAuthNotice authUser={authUser} isRtl={isRtl} returnToUrl={returnToUrl} />
        {expertProfiles.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {expertProfiles.map((ex) => {
              const exUser = userMap.get(ex.memberId);
              return (
                <div key={ex.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-1.5">
                  <div className="text-xs font-bold text-white">{exUser?.name || ex.memberId}</div>
                  <p className="text-[11px] text-slate-400">{ex.experienceBio}</p>
                  <div className="flex flex-wrap gap-1">
                    {ex.verifiedSpecialties.map((s, idx) => (
                      <span key={idx} className="rounded bg-indigo-500/15 border border-indigo-500/30 px-1.5 py-0.5 text-[10px] text-indigo-300">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {isRtl ? 'تقديم عرض مساعدة على الطلبات المفتوحة' : 'Offer Assistance on Open Requests'}
          </h3>
          {openRequests.map((r) => (
            <div key={r.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-white">{r.title}</span>
                <button
                  type="button"
                  onClick={() => setOfferReqId(offerReqId === r.id ? null : r.id)}
                  className="rounded-md bg-emerald-600/20 border border-emerald-500/40 px-3 py-1 text-xs font-semibold text-emerald-300"
                >
                  {offerReqId === r.id ? (isRtl ? 'إلغاء' : 'Cancel') : (isRtl ? 'تقديم عرض' : 'Offer Service')}
                </button>
              </div>
              {offerReqId === r.id && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <textarea
                    rows={2}
                    value={offerText}
                    onChange={(e) => setOfferText(e.target.value)}
                    placeholder={isRtl ? 'صف خبرتك وكيفية تنفيذك للمهمة...' : 'Describe your approach and deliverable...'}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-xs text-white"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={offerTimeline}
                      onChange={(e) => setOfferTimeline(e.target.value)}
                      placeholder="Timeline"
                      className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                    />
                    <button
                      type="button"
                      disabled={!authUser || busyId === r.id}
                      onClick={() =>
                        runBusy(r.id, async () => {
                          const ok = await onAction(
                            'submit_offer',
                            {
                              requestId: r.id,
                              communityId: community.id,
                              proposedHelp: offerText.trim() || `Specialist assistance for ${r.title}`,
                              availability: offerTimeline.trim() || '2-3 days'
                            },
                            isRtl ? 'تم إرسال عرضك المتخصص!' : 'Specialist service offer submitted!'
                          );
                          if (ok) {
                            setOfferReqId(null);
                            setOfferText('');
                            await onRecordCompletion();
                          }
                        })
                      }
                      className="rounded-md bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
                    >
                      {busyId === r.id ? '...' : isRtl ? 'إرسال العرض' : 'Confirm Offer'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 10. LIGHTWEIGHT APPOINTMENT BOOKING (link_11_booking)
  // =========================================================================
  if (link.linkType === 'link_11_booking') {
    return (
      <div className="space-y-4">
        <GuestAuthNotice authUser={authUser} isRtl={isRtl} returnToUrl={returnToUrl} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!bookingTopic.trim()) return;
            runBusy('book', async () => {
              const ok = await onAction(
                'book_appointment',
                {
                  communityId: community.id,
                  expertProfileId: selectedExpertId || expertProfiles[0]?.id || 'exp_general',
                  requestedSlot: bookingSlot,
                  topic: bookingTopic.trim()
                },
                isRtl ? 'تم تأكيد حجز الجلسة الاستشارية بدون رسوم!' : 'Consultation slot booked cleanly!'
              );
              if (ok) {
                setBookingTopic('');
                await onRecordCompletion();
              }
            });
          }}
          className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3"
        >
          <h3 className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>{isRtl ? 'حجز موعد استشارة مجاني مع خبير' : 'Book Consultation Slot (Zero-Fee)'}</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">{isRtl ? 'الخبير' : 'Expert'}</label>
              <select
                value={selectedExpertId}
                onChange={(e) => setSelectedExpertId(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
              >
                {expertProfiles.length === 0 ? (
                  <option value="exp_general">{community.name} Mentor</option>
                ) : (
                  expertProfiles.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {userMap.get(ex.memberId)?.name || ex.memberId}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">{isRtl ? 'الموعد المتاح' : 'Time Slot'}</label>
              <input
                type="text"
                required
                value={bookingSlot}
                onChange={(e) => setBookingSlot(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-slate-300 mb-1">
              {isRtl ? 'موضوع الجلسة' : 'Consultation Topic'} <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={bookingTopic}
              onChange={(e) => setBookingTopic(e.target.value)}
              placeholder={isRtl ? 'مثال: مراجعة معمارية أو خطة تسليم' : 'e.g., Webhook integration review'}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!authUser || busyId === 'book'}
              className="rounded-md bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-40"
            >
              {busyId === 'book' ? '...' : isRtl ? 'تأكيد الحجز' : 'Confirm Booking'}
            </button>
          </div>
        </form>

        {appointments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400">{isRtl ? 'مواعيدك المؤكدة' : 'Your Scheduled Bookings'}</h4>
            {appointments.map((apt) => (
              <div key={apt.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-white">{apt.topic}</div>
                  <div className="text-[11px] text-slate-400">{apt.requestedSlot}</div>
                </div>
                <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                  {apt.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 11. EVENT RSVP (link_12_rsvp) & ATTENDANCE (link_21_attendance)
  // =========================================================================
  if (link.linkType === 'link_12_rsvp' || link.linkType === 'link_21_attendance') {
    const isAttendanceMode = link.linkType === 'link_21_attendance';
    return (
      <div className="space-y-3">
        <GuestAuthNotice authUser={authUser} isRtl={isRtl} returnToUrl={returnToUrl} />
        {events.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            {isRtl ? 'لا توجد فعاليات مجدولة في هذا المجتمع حالياً.' : 'No community events scheduled yet.'}
          </p>
        ) : (
          events.map((evt) => {
            const hasRsvped = Boolean(authUser && evt.rsvps.some((r) => r.userId === authUser.id));
            return (
              <div key={evt.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">{evt.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{evt.description}</p>
                    <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-3">
                      <span>📅 {new Date(evt.date).toLocaleString()}</span>
                      <span>📍 {evt.location}</span>
                      <span>
                        👥 {evt.rsvps.length} RSVP · {evt.confirmedAttendees.length} {isRtl ? 'حاضر مؤكد' : 'confirmed'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!authUser || busyId === evt.id}
                    onClick={() =>
                      runBusy(evt.id, async () => {
                        const ok = await onAction(
                          'rsvp_event',
                          { eventId: evt.id },
                          hasRsvped ? (isRtl ? 'تم إلغاء تأكيد الحضور.' : 'RSVP cancelled.') : (isRtl ? 'تم تسجيل حضورك بنجاح!' : 'RSVP confirmed!')
                        );
                        if (ok && !hasRsvped) await onRecordCompletion();
                      })
                    }
                    className={`rounded-md px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-40 ${
                      hasRsvped ? 'bg-slate-700 hover:bg-slate-600' : 'bg-indigo-600 hover:bg-indigo-500'
                    }`}
                  >
                    {hasRsvped ? (isRtl ? 'إلغاء التسجيل ✓' : 'Going ✓ (Cancel)') : (isRtl ? 'تأكيد الحضور RSVP' : 'RSVP Now')}
                  </button>
                </div>

                {isAttendanceMode && isOwnerOrStaff && evt.rsvps.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400 block">
                      {isRtl ? 'تأكيد الحضور الفعلي (للمنظمين):' : 'Organizer Attendance Check-In:'}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {evt.rsvps.map((r) => {
                        const isConfirmed = evt.confirmedAttendees.some((a) => a.userId === r.userId);
                        const uName = userMap.get(r.userId)?.name || r.userId;
                        return (
                          <button
                            key={r.userId}
                            type="button"
                            disabled={isConfirmed || busyId === `${evt.id}_${r.userId}`}
                            onClick={() =>
                              runBusy(`${evt.id}_${r.userId}`, async () => {
                                await onAction(
                                  'confirm_event_attendance',
                                  { eventId: evt.id, userId: r.userId, evidenceNote: 'Confirmed via Attendance Action Link' },
                                  isRtl ? `تم تأكيد حضور ${uName}` : `Confirmed attendance for ${uName}`
                                );
                              })
                            }
                            className={`rounded px-2.5 py-1 text-[11px] font-semibold border ${
                              isConfirmed
                                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                                : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-indigo-500'
                            }`}
                          >
                            {isConfirmed ? `✓ ${uName}` : `${isRtl ? 'تأكيد:' : 'Check in'} ${uName}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  }

  // =========================================================================
  // 12. EXECUTION CHECKLIST (link_13_checklist) & TASK CARD (link_18_task_card)
  // =========================================================================
  if (link.linkType === 'link_13_checklist' || link.linkType === 'link_18_task_card') {
    const targetTasks =
      link.targetEntityId && tasks.some((t) => t.id === link.targetEntityId)
        ? tasks.filter((t) => t.id === link.targetEntityId)
        : activeTasks;

    return (
      <div className="space-y-3">
        <GuestAuthNotice authUser={authUser} isRtl={isRtl} returnToUrl={returnToUrl} />
        {targetTasks.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            {isRtl ? 'جميع المهام مكتملة!' : 'No pending tasks or checklists in this community.'}
          </p>
        ) : (
          targetTasks.map((t) => {
            const isOverdue = nowMs > 0 && new Date(t.deadline).getTime() < nowMs && t.status !== 'completed';
            const doneCount = t.checklist.filter((c) => c.completed).length;
            return (
              <div key={t.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">{t.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{t.description}</p>
                    {t.acceptanceCriteria && (
                      <p className="text-[11px] text-indigo-300 mt-1">
                        {isRtl ? 'معيار القبول:' : 'Acceptance Criteria:'} {t.acceptanceCriteria}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isOverdue && (
                      <span className="rounded bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[10px] font-mono text-rose-300">
                        {isRtl ? 'متأخر' : 'Overdue'}
                      </span>
                    )}
                    <span className="rounded bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-mono text-indigo-300">
                      {doneCount}/{t.checklist.length}
                    </span>
                  </div>
                </div>

                {t.checklist.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {t.checklist.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer rounded-md border border-slate-800/80 bg-slate-900/50 px-3 py-1.5"
                      >
                        <input
                          type="checkbox"
                          checked={item.completed}
                          disabled={!authUser || busyId === item.id}
                          onChange={(e) =>
                            runBusy(item.id, async () => {
                              await onAction(
                                'update_checklist',
                                { taskId: t.id, checklistId: item.id, completed: e.target.checked },
                                isRtl ? 'تم تحديث قائمة التحقق.' : 'Checklist progress persisted.'
                              );
                            })
                          }
                          className="rounded border-slate-600 bg-slate-900 text-indigo-500"
                        />
                        <span className={item.completed ? 'line-through text-slate-500' : ''}>{item.item}</span>
                      </label>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                  {!t.assigneeId && authUser && (
                    <button
                      type="button"
                      disabled={busyId === t.id}
                      onClick={() =>
                        runBusy(t.id, async () => {
                          await onAction('claim_task', { taskId: t.id }, isRtl ? 'تم استلام المهمة.' : 'Task claimed!');
                        })
                      }
                      className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                    >
                      {isRtl ? 'استلام المهمة' : 'Claim Task'}
                    </button>
                  )}
                  {t.assigneeId && t.status !== 'completed' && authUser && (
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <input
                        type="url"
                        value={evidenceUrl}
                        onChange={(e) => setEvidenceUrl(e.target.value)}
                        placeholder="https://github.com/..."
                        className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                      />
                      <button
                        type="button"
                        disabled={busyId === `comp_${t.id}`}
                        onClick={() =>
                          runBusy(`comp_${t.id}`, async () => {
                            const ok = await onAction(
                              'complete_task',
                              { taskId: t.id, evidenceUrl: evidenceUrl.trim(), description: `Delivered via Action Link (${link.slug})` },
                              isRtl ? 'تم تسليم الدليل وإرساله للمراجعة!' : 'Deliverable submitted for verification!'
                            );
                            if (ok) await onRecordCompletion();
                          })
                        }
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                      >
                        {isRtl ? 'تسليم الدليل' : 'Submit Evidence'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  // =========================================================================
  // 13. EVIDENCE SUBMISSION (link_14_evidence)
  // =========================================================================
  if (link.linkType === 'link_14_evidence') {
    return (
      <div className="space-y-4">
        <GuestAuthNotice authUser={authUser} isRtl={isRtl} returnToUrl={returnToUrl} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runBusy('evidence', async () => {
              const ok = selectedTaskId
                ? await onAction(
                    'complete_task',
                    {
                      taskId: selectedTaskId,
                      evidenceUrl: evidenceUrl.trim(),
                      description: evidenceDesc.trim() || `Evidence submitted via /l/${link.slug}`
                    },
                    isRtl ? 'تم إرسال دليل التسليم للمراجعة!' : 'Task deliverable evidence submitted!'
                  )
                : await onAction(
                    'submit_contribution',
                    {
                      communityId: community.id,
                      categoryId: community.contributionCategories?.[0]?.id || 'cat_core',
                      title: evidenceTitle.trim() || 'Community Deliverable',
                      description: evidenceDesc.trim() || 'Submitted via Evidence Action Link',
                      evidence: [
                        {
                          id: `ev_${Date.now()}`,
                          type: 'link',
                          url: evidenceUrl.trim(),
                          description: evidenceDesc.trim() || 'Deliverable link',
                          submittedAt: new Date().toISOString()
                        }
                      ]
                    },
                    isRtl ? 'تم تسجيل المساهمة والدليل للمراجعة!' : 'Contribution & evidence recorded for peer review!'
                  );
              if (ok) {
                setEvidenceDesc('');
                setEvidenceTitle('');
                await onRecordCompletion();
              }
            });
          }}
          className="rounded-xl border border-emerald-500/30 bg-slate-950/70 p-4 space-y-3"
        >
          <h3 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            <span>{isRtl ? 'نموذج تسليم أدلة العمل (SourceTrail)' : 'Direct SourceTrail Evidence Upload'}</span>
          </h3>
          {activeTasks.length > 0 && (
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">
                {isRtl ? 'ربط بمهمة نشطة (أو مساهمة عامة)' : 'Link to Active Task (or submit standalone)'}
              </label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
              >
                <option value="">{isRtl ? '-- مساهمة عامة مستقلة --' : '-- Standalone Contribution --'}</option>
                {activeTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!selectedTaskId && (
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">
                {isRtl ? 'عنوان المساهمة' : 'Contribution Title'} <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required={!selectedTaskId}
                value={evidenceTitle}
                onChange={(e) => setEvidenceTitle(e.target.value)}
                placeholder={isRtl ? 'مثال: توثيق واجهة API' : 'e.g., API Documentation PR'}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
              />
            </div>
          )}
          <div>
            <label className="block text-[11px] text-slate-300 mb-1">
              {isRtl ? 'رابط الدليل الموثق (HTTPS/HTTP)' : 'Verifiable Evidence URL (HTTPS/HTTP)'} <span className="text-rose-400">*</span>
            </label>
            <input
              type="url"
              required
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://github.com/org/repo/pull/12"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-300 mb-1">{isRtl ? 'ملخص الإنجاز' : 'Deliverable Summary'}</label>
            <textarea
              rows={2}
              value={evidenceDesc}
              onChange={(e) => setEvidenceDesc(e.target.value)}
              placeholder={isRtl ? 'اشرح ما تم تنفيذه...' : 'Summary of completed work and verification steps...'}
              className="w-full rounded-md border border-slate-700 bg-slate-900 p-2.5 text-xs text-white"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!authUser || busyId === 'evidence'}
              className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
            >
              {busyId === 'evidence' ? '...' : isRtl ? 'إرسال الدليل للمراجعة' : 'Submit Evidence'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // =========================================================================
  // 14. DECISION & POLLS / REVIEW (link_15_decision)
  // =========================================================================
  if (link.linkType === 'link_15_decision') {
    const pendingReviews = contributions.filter((c) => c.reviewStatus === 'pending' || c.reviewStatus === 'revision_requested');
    return (
      <div className="space-y-5">
        <GuestAuthNotice authUser={authUser} isRtl={isRtl} returnToUrl={returnToUrl} />
        {polls.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
              <Vote className="h-4 w-4" />
              <span>{isRtl ? 'تصويت المجتمع (Poll2Plan)' : 'Active Community Decision Polls'}</span>
            </h3>
            {polls.map((poll) => (
              <div key={poll.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2.5">
                <div className="text-sm font-bold text-white">{isRtl && poll.questionAr ? poll.questionAr : poll.question}</div>
                <div className="space-y-1.5">
                  {poll.alternatives.map((alt) => {
                    const voted = Boolean(authUser && alt.votes.includes(authUser.id));
                    return (
                      <button
                        key={alt.id}
                        type="button"
                        disabled={!authUser || poll.status === 'closed' || busyId === alt.id}
                        onClick={() =>
                          runBusy(alt.id, async () => {
                            const ok = await onAction(
                              'cast_vote',
                              { pollId: poll.id, alternativeId: alt.id },
                              isRtl ? 'تم تسجيل صوتك!' : 'Vote recorded!'
                            );
                            if (ok) await onRecordCompletion();
                          })
                        }
                        className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-xs text-start transition-colors ${
                          voted
                            ? 'border-indigo-500 bg-indigo-950/40 text-white'
                            : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span>{alt.text}</span>
                        <span className="font-mono text-indigo-300">{alt.votes.length} votes</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {isRtl ? 'قرارات مراجعة المساهمات' : 'Reviewer Contribution Decisions'}
          </h3>
          {pendingReviews.length === 0 ? (
            <p className="text-xs text-slate-400">{isRtl ? 'لا توجد مساهمات معلقة للمراجعة.' : 'No pending contribution reviews.'}</p>
          ) : (
            pendingReviews.map((cnt) => (
              <div key={cnt.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-2">
                <div className="text-xs font-bold text-white">{cnt.title}</div>
                <input
                  type="text"
                  value={reviewReasons[cnt.id] || ''}
                  onChange={(e) => setReviewReasons((p) => ({ ...p, [cnt.id]: e.target.value }))}
                  placeholder={isRtl ? 'ملاحظات المراجع (إلزامي)...' : 'Reviewer decision reason (required)...'}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                />
                <div className="flex flex-wrap gap-2">
                  {(['verified', 'revision_requested', 'rejected'] as const).map((dec) => (
                    <button
                      key={dec}
                      type="button"
                      disabled={!isOwnerOrStaff || busyId === `${cnt.id}_${dec}`}
                      onClick={() =>
                        runBusy(`${cnt.id}_${dec}`, async () => {
                          const ok = await onAction(
                            'review_contribution',
                            { contributionId: cnt.id, decision: dec, reason: reviewReasons[cnt.id] || `Decision: ${dec}` },
                            `Decision (${dec}) persisted.`
                          );
                          if (ok) await onRecordCompletion();
                        })
                      }
                      className="rounded bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
                    >
                      {dec.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 15. TRUSTED KNOWLEDGE SOURCE (link_16_knowledge_source)
  // =========================================================================
  if (link.linkType === 'link_16_knowledge_source') {
    return (
      <div className="space-y-4">
        <GuestAuthNotice authUser={authUser} isRtl={isRtl} returnToUrl={returnToUrl} />
        <div className="space-y-2.5">
          {knowledge.map((art) => (
            <div key={art.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-white">{isRtl && art.titleAr ? art.titleAr : art.title}</h3>
                <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                  v{art.version} · {art.status}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{art.content}</p>
              {art.sources.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {art.sources.map((src, i) => (
                    <a
                      key={i}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:underline font-mono"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>{src.title}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!knwTitle.trim() || !knwContent.trim()) return;
            runBusy('knw', async () => {
              const ok = await onAction(
                'publish_knowledge',
                {
                  communityId: community.id,
                  title: knwTitle.trim(),
                  content: knwContent.trim(),
                  category: 'Verified Reference',
                  reviewDueIntervalDays: 90,
                  sources: knwSourceUrl.trim() ? [{ title: 'Primary Reference', url: knwSourceUrl.trim(), context: 'Action Link Submission' }] : []
                },
                isRtl ? 'تم نشر المرجع المعرفي!' : 'Verified knowledge card published!'
              );
              if (ok) {
                setKnwTitle('');
                setKnwContent('');
                setKnwSourceUrl('');
                await onRecordCompletion();
              }
            });
          }}
          className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2.5"
        >
          <div className="text-xs font-bold text-white flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-sky-400" />
            <span>{isRtl ? 'إضافة مرجع معرفي موثق بمصدر' : 'Add Cited Knowledge Article'}</span>
          </div>
          <input
            type="text"
            required
            value={knwTitle}
            onChange={(e) => setKnwTitle(e.target.value)}
            placeholder={isRtl ? 'عنوان المرجع...' : 'Knowledge article title...'}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
          />
          <textarea
            rows={2}
            required
            value={knwContent}
            onChange={(e) => setKnwContent(e.target.value)}
            placeholder={isRtl ? 'الملخص الفني والمعلومة المؤكدة...' : 'Factual recommendation and context...'}
            className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-xs text-white"
          />
          <input
            type="url"
            value={knwSourceUrl}
            onChange={(e) => setKnwSourceUrl(e.target.value)}
            placeholder="https://docs.example.org/spec (optional source URL)"
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!authUser || busyId === 'knw'}
              className="rounded-md bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-40"
            >
              {isRtl ? 'نشر المرجع' : 'Publish Knowledge'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // =========================================================================
  // 16. ROLE-BASED ONBOARDING & INVITE (link_17_onboarding) & REFERRAL (link_23_referral)
  // =========================================================================
  if (link.linkType === 'link_17_onboarding' || link.linkType === 'link_23_referral') {
    const isReferral = link.linkType === 'link_23_referral';
    return (
      <div className="space-y-4">
        <GuestAuthNotice authUser={authUser} isRtl={isRtl} returnToUrl={returnToUrl} />
        <div className="rounded-xl border border-indigo-500/30 bg-slate-950/70 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <UserPlus className="h-4 w-4" />
              <span>
                {isReferral
                  ? isRtl ? `دعوة إحالة موثقة (${link.referralCode || community.slug})` : `Attributed Community Referral (${link.referralCode || community.slug})`
                  : isRtl ? `الانضمام وتأهيل الأعضاء الجدد — ${community.name}` : `Join & Onboard to ${community.name}`}
              </span>
            </h3>
          </div>
          {community.welcomeMessage && <p className="text-xs text-slate-300">{community.welcomeMessage}</p>}
          <ul className="space-y-1 text-[11px] text-slate-400 list-disc ps-5">
            {(community.rules || []).map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={acceptedRules}
              onChange={(e) => setAcceptedRules(e.target.checked)}
              className="rounded border-slate-600 bg-slate-900 text-indigo-500"
            />
            <span>{isRtl ? 'أوافق على قواعد المجتمع وميثاق الأدلة الموثقة' : 'I agree to the community rules and evidence verification charter'}</span>
          </label>

          {!isReferral && (
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                {isRtl ? 'رمز الدعوة الخاص (اختياري)' : 'Invite Code (optional)'}
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="DEVFORGE-2026"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!authUser || !acceptedRules || busyId === 'join'}
              onClick={() =>
                runBusy('join', async () => {
                  const ok = inviteCode.trim()
                    ? await onAction('redeem_invite_code', { code: inviteCode.trim() }, isRtl ? 'تم الانضمام برمز الدعوة!' : 'Joined community via invite code!')
                    : await onAction(
                        'join_community',
                        { communityId: community.id, referralCode: link.referralCode },
                        isRtl ? `مرحباً بك في ${community.name}!` : `Joined ${community.name}!`
                      );
                  if (ok) await onRecordCompletion();
                })
              }
              className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
            >
              {busyId === 'join' ? '...' : isRtl ? 'تأكيد الانضمام الآن' : 'Complete Onboarding & Join'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 17. MANUAL REQUEST STATUS UPDATE (link_19_status_update)
  // =========================================================================
  if (link.linkType === 'link_19_status_update') {
    return (
      <div className="space-y-3">
        <GuestAuthNotice authUser={authUser} isRtl={isRtl} returnToUrl={returnToUrl} />
        {requests.map((r) => (
          <div key={r.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-white">{r.title}</span>
              <span className="rounded bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-mono text-indigo-300">
                {r.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={statusNotes[r.id] || ''}
                onChange={(e) => setStatusNotes((p) => ({ ...p, [r.id]: e.target.value }))}
                placeholder={isRtl ? 'ملاحظة التحديث...' : 'Optional status note...'}
                className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
              />
              {(['open', 'in_progress', 'completed', 'closed'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  disabled={!authUser || busyId === `${r.id}_${st}`}
                  onClick={() =>
                    runBusy(`${r.id}_${st}`, async () => {
                      const ok = await onAction(
                        'update_request_status',
                        { requestId: r.id, status: st, notes: statusNotes[r.id] || `Updated via /l/${link.slug}` },
                        isRtl ? 'تم تحديث حالة الطلب.' : `Request updated to ${st}.`
                      );
                      if (ok) await onRecordCompletion();
                    })
                  }
                  className={`rounded px-2.5 py-1 text-[11px] font-semibold border ${
                    r.status === st
                      ? 'border-indigo-500 bg-indigo-600 text-white'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-indigo-400'
                  } disabled:opacity-40`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // =========================================================================
  // 18. MULTI-COMMUNITY NETWORK (link_20_multi_community)
  // =========================================================================
  if (link.linkType === 'link_20_multi_community') {
    const crossReqs = requests.filter((r) => r.visibility === 'cross_community' || r.visibility === 'public');
    return (
      <div className="space-y-4">
        <GuestAuthNotice authUser={authUser} isRtl={isRtl} returnToUrl={returnToUrl} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {communities.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-1">
              <div className="text-xs font-bold text-white">{c.name}</div>
              <div className="text-[11px] text-slate-400 line-clamp-2">{c.description}</div>
              {authUser && (
                <button
                  type="button"
                  disabled={busyId === c.id}
                  onClick={() =>
                    runBusy(c.id, async () => {
                      await onAction('join_community', { communityId: c.id }, `Joined ${c.name}!`);
                    })
                  }
                  className="mt-1 rounded bg-indigo-600/25 border border-indigo-500/40 px-2.5 py-1 text-[10px] font-semibold text-indigo-200 hover:bg-indigo-600/40"
                >
                  {isRtl ? 'انضمام للشبكة' : 'Join Partner Hub'}
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase">
            {isRtl ? 'طلبات المساعدة المشتركة بين المجتمعات' : 'Shared Cross-Community Requests'}
          </h4>
          {(crossReqs.length > 0 ? crossReqs : openRequests).map((r) => (
            <div key={r.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold text-white">{r.title}</div>
                <div className="text-[11px] text-slate-400">{r.visibility} · {r.priority}</div>
              </div>
              <button
                type="button"
                disabled={!authUser || busyId === r.id}
                onClick={() =>
                  runBusy(r.id, async () => {
                    const ok = await onAction(
                      'submit_offer',
                      { requestId: r.id, communityId: r.communityId, proposedHelp: 'Cross-community partner offer via Action Link' },
                      isRtl ? 'تم إرسال عرض التعاون المشترك!' : 'Cross-community assistance offer sent!'
                    );
                    if (ok) await onRecordCompletion();
                  })
                }
                className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
              >
                {isRtl ? 'تقديم دعم' : 'Offer Cross-Help'}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 19. SINGLE CONTRIBUTION PUBLIC CARD (link_22_single_contribution)
  // =========================================================================
  if (link.linkType === 'link_22_single_contribution') {
    const cnt =
      (link.targetEntityId && contributions.find((c) => c.id === link.targetEntityId)) ||
      contributions.find((c) => c.reviewStatus === 'verified') ||
      contributions[0];
    if (!cnt) {
      return <p className="text-xs text-slate-400 py-4 text-center">{isRtl ? 'لا توجد مساهمة معروضة حالياً.' : 'No contribution card found.'}</p>;
    }
    const author = userMap.get(cnt.memberId);
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-slate-950/80 p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-mono text-emerald-400 uppercase">{cnt.reviewStatus}</span>
          <span className="text-[11px] text-slate-400">{new Date(cnt.submissionDate).toLocaleDateString()}</span>
        </div>
        <h3 className="text-base font-bold text-white">{cnt.title}</h3>
        <p className="text-xs text-slate-300 leading-relaxed">{cnt.description}</p>
        <div className="text-xs text-slate-400">
          {isRtl ? 'المساهم:' : 'Contributor:'}{' '}
          <Link href={`/p/${cnt.memberId}`} className="font-bold text-indigo-300 hover:underline">
            {author?.name || cnt.memberId}
          </Link>
        </div>
        {cnt.evidence.map((ev) => (
          <a
            key={ev.id}
            href={ev.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:underline font-mono break-all"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span>{ev.url}</span>
          </a>
        ))}
      </div>
    );
  }

  // =========================================================================
  // 20. ISSUE & DISPUTE REPORT (link_24_issue_report)
  // =========================================================================
  if (link.linkType === 'link_24_issue_report') {
    return (
      <div className="space-y-4">
        <GuestAuthNotice authUser={authUser} isRtl={isRtl} returnToUrl={returnToUrl} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!disputeReason.trim()) return;
            runBusy('dispute', async () => {
              const ok = await onAction(
                'file_dispute',
                {
                  communityId: community.id,
                  contributionId: disputeContribId || contributions[0]?.id || 'cnt_general',
                  reason: disputeReason.trim(),
                  evidenceLinks: disputeEvidence.trim() ? [disputeEvidence.trim()] : []
                },
                isRtl ? 'تم رفع بلاغ Community Shield بنجاح.' : 'Community Shield issue report filed cleanly.'
              );
              if (ok) {
                setDisputeReason('');
                setDisputeEvidence('');
                await onRecordCompletion();
              }
            });
          }}
          className="rounded-xl border border-rose-500/30 bg-slate-950/70 p-4 space-y-3"
        >
          <h3 className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4" />
            <span>{isRtl ? 'بلاغ أو اعتراض Community Shield' : 'Report Issue / Contribution Dispute'}</span>
          </h3>
          {contributions.length > 0 && (
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">{isRtl ? 'السجل المعني' : 'Target Contribution'}</label>
              <select
                value={disputeContribId}
                onChange={(e) => setDisputeContribId(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
              >
                {contributions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.reviewStatus})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-[11px] text-slate-300 mb-1">
              {isRtl ? 'سبب البلاغ أو الاعتراض' : 'Issue / Dispute Reason'} <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder={isRtl ? 'اشرح الخلل أو سبب الاعتراض بالتفصيل...' : 'Explain the issue or evidence discrepancy...'}
              className="w-full rounded-md border border-slate-700 bg-slate-900 p-2.5 text-xs text-white"
            />
          </div>
          <input
            type="url"
            value={disputeEvidence}
            onChange={(e) => setDisputeEvidence(e.target.value)}
            placeholder="https://... (optional supporting evidence URL)"
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white font-mono"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!authUser || busyId === 'dispute'}
              className="rounded-md bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-40"
            >
              {busyId === 'dispute' ? '...' : isRtl ? 'رفع البلاغ' : 'File Dispute'}
            </button>
          </div>
        </form>

        {disputes.length > 0 && (
          <div className="space-y-2">
            {disputes.map((d) => (
              <div key={d.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">{d.reason}</span>
                  <span className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono text-amber-300">
                    {d.status}
                  </span>
                </div>
                {authUser && d.status !== 'appealed' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={appealNotes[d.id] || ''}
                      onChange={(e) => setAppealNotes((p) => ({ ...p, [d.id]: e.target.value }))}
                      placeholder={isRtl ? 'مذكرة الاستئناف...' : 'Appeal statement...'}
                      className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-white"
                    />
                    <button
                      type="button"
                      disabled={busyId === `app_${d.id}`}
                      onClick={() =>
                        runBusy(`app_${d.id}`, async () => {
                          await onAction(
                            'appeal_dispute',
                            { disputeId: d.id, appealNotes: appealNotes[d.id] || 'Formal appeal requested' },
                            isRtl ? 'تم رفع الاستئناف بنجاح.' : 'Appeal submitted cleanly.'
                          );
                        })
                      }
                      className="rounded bg-amber-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-amber-500"
                    >
                      {isRtl ? 'استئناف' : 'Appeal'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 21. AUDIENCE & EXPIRY PROTECTED LINK (link_25_audience_expiry)
  // =========================================================================
  if (link.linkType === 'link_25_audience_expiry') {
    const remainingUses = link.maxUses ? Math.max(0, link.maxUses - link.stats.completions) : null;
    return (
      <div className="rounded-xl border border-amber-500/30 bg-slate-950/75 p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300">
            <Lock className="h-4 w-4" />
            <span>{isRtl ? 'رابط مؤقت مقيد بالصلاحية والجمهور' : 'Time-Boxed & Audience-Verified Link'}</span>
          </span>
          <span className="rounded bg-slate-900 border border-slate-700 px-2 py-0.5 text-[10px] font-mono text-slate-300">
            {link.audience}
            {link.requiredRole ? ` · ${link.requiredRole}` : ''}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <span className="text-[10px] text-slate-500 block">{isRtl ? 'تاريخ الانتهاء' : 'Expiration'}</span>
            <span className="font-mono">{link.expiresAt ? new Date(link.expiresAt).toLocaleString() : isRtl ? 'نشط بدون انتهاء محدد' : 'No fixed expiration'}</span>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <span className="text-[10px] text-slate-500 block">{isRtl ? 'الاستخدامات المتبقية' : 'Remaining Completions'}</span>
            <span className="font-mono">{remainingUses === null ? (isRtl ? 'غير محدود' : 'Unlimited') : `${remainingUses} / ${link.maxUses}`}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onRecordCompletion}
          className="rounded-md bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-500"
        >
          {isRtl ? 'تأكيد استلام وإتمام الإجراء المحمي' : 'Confirm Protected Access Completion'}
        </button>
      </div>
    );
  }

  // =========================================================================
  // 22. OWNER OUTCOME REPORT (link_26_outcome_report)
  // =========================================================================
  if (link.linkType === 'link_26_outcome_report') {
    const publicOutcomes = outcomes.filter((o) => o.shareable !== false);
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="text-base font-bold font-mono text-white">{requests.length}</div>
            <div className="text-[10px] text-slate-400">{isRtl ? 'طلبات' : 'Requests'}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="text-base font-bold font-mono text-indigo-300">{tasks.filter((t) => t.status === 'completed').length}</div>
            <div className="text-[10px] text-slate-400">{isRtl ? 'مهام منجزة' : 'Tasks Completed'}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="text-base font-bold font-mono text-emerald-300">
              {contributions.filter((c) => c.reviewStatus === 'verified').length}
            </div>
            <div className="text-[10px] text-slate-400">{isRtl ? 'نتائج موثقة' : 'Verified Contributions'}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="text-base font-bold font-mono text-amber-300">{publicOutcomes.length}</div>
            <div className="text-[10px] text-slate-400">{isRtl ? 'تقارير منشورة' : 'Published Outcomes'}</div>
          </div>
        </div>

        <div className="space-y-2.5">
          {publicOutcomes.map((o) => (
            <div key={o.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-white">{o.objective}</h3>
                <Link
                  href={`/outcome/${o.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:underline shrink-0"
                >
                  <span>{isRtl ? 'شهادة النتيجة' : 'Certificate'}</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              <p className="text-xs text-slate-300">{o.deliveredResult}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 23. DEFAULT / MULTIPURPOSE HUB (hub_multipurpose)
  // =========================================================================
  return (
    <div className="space-y-4">
      <GuestAuthNotice authUser={authUser} isRtl={isRtl} returnToUrl={returnToUrl} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
          <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
            <HandHelping className="h-4 w-4" />
            <span>{isRtl ? `طلبات المساعدة المفتوحة (${openRequests.length})` : `Active NeedSignal Requests (${openRequests.length})`}</span>
          </div>
          {openRequests.slice(0, 4).map((r) => (
            <div key={r.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5 space-y-1.5">
              <div className="text-xs font-semibold text-white">{r.title}</div>
              <button
                type="button"
                disabled={!authUser || busyId === r.id}
                onClick={() =>
                  runBusy(r.id, async () => {
                    const ok = await onAction(
                      'submit_offer',
                      { requestId: r.id, communityId: community.id, proposedHelp: `Offer sent via ${community.name} Hub` },
                      isRtl ? 'تم إرسال العرض بنجاح!' : 'Help offer recorded!'
                    );
                    if (ok) await onRecordCompletion();
                  })
                }
                className="rounded bg-emerald-600/25 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-600/40 disabled:opacity-40"
              >
                {isRtl ? 'تقديم مساعدة' : 'Offer Help'}
              </button>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
          <div className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
            <ClipboardList className="h-4 w-4" />
            <span>{isRtl ? `المهام المتاحة (${activeTasks.length})` : `QuestLoop Active Tasks (${activeTasks.length})`}</span>
          </div>
          {activeTasks.slice(0, 4).map((t) => (
            <div key={t.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5 space-y-1.5">
              <div className="text-xs font-semibold text-white">{t.title}</div>
              {!t.assigneeId ? (
                <button
                  type="button"
                  disabled={!authUser || busyId === t.id}
                  onClick={() =>
                    runBusy(t.id, async () => {
                      await onAction('claim_task', { taskId: t.id }, isRtl ? 'تم استلام المهمة!' : 'Task claimed!');
                    })
                  }
                  className="rounded bg-indigo-600 px-2.5 py-0.5 text-[11px] font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
                >
                  {isRtl ? 'تولي المهمة' : 'Claim Task'}
                </button>
              ) : (
                <span className="text-[10px] font-mono text-slate-400">{t.status}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
