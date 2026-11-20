'use client';

import React, { useState, useEffect } from 'react';
import { translations } from '@/lib/i18n';
import { Contribution, MutualAttestation, Dispute, Community, User, Language, UserRole } from '@/lib/types';
import { ShieldCheck, AlertOctagon, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

interface TrustGraphSectionProps {
  contributions: Contribution[];
  attestations: MutualAttestation[];
  disputes: Dispute[];
  community: Community;
  currentUser: User;
  currentUserRole?: UserRole;
  users: User[];
  lang: Language;
  onRefresh: () => void;
}

export const TrustGraphSection: React.FC<TrustGraphSectionProps> = ({
  contributions,
  attestations,
  disputes,
  community,
  currentUser,
  currentUserRole = 'member',
  users,
  lang,
  onRefresh
}) => {
  const _t = translations[lang];
  const isRtl = lang === 'ar';

  const [activeSubTab, setActiveSubTab] = useState<'contributions' | 'attestations' | 'disputes'>('contributions');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Review Drawer State
  const [reviewingContributionId, setReviewingContributionId] = useState<string | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'verified' | 'revision_requested' | 'rejected' | 'disputed'>('verified');
  const [reviewReason, setReviewReason] = useState('');

  // Resubmit Revision State (Contributor)
  const [resubmittingId, setResubmittingId] = useState<string | null>(null);
  const [resubmitUrl, setResubmitUrl] = useState('');
  const [resubmitDesc, setResubmitDesc] = useState('');

  // File Dispute & Appeal State
  const [isFilingDispute, setIsFilingDispute] = useState(false);
  const [disputeContribId, setDisputeContribId] = useState(contributions[0]?.id || '');
  const [disputeReason, setDisputeReason] = useState('');
  const [appealingDisputeId, setAppealingDisputeId] = useState<string | null>(null);
  const [appealReason, setAppealReason] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisputeContribId((prev) =>
        prev && contributions.some((c) => c.id === prev) ? prev : (contributions[0]?.id || '')
      );
      setReviewingContributionId(null);
      setFeedback(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [community.id, contributions]);

  const effectiveDisputeContribId =
    disputeContribId && contributions.some((c) => c.id === disputeContribId)
      ? disputeContribId
      : (contributions[0]?.id || '');

  const canReview =
    ['platform_admin', 'community_owner', 'admin', 'reviewer'].includes(currentUserRole) ||
    currentUser.id === community.ownerId ||
    currentUser.platformRole === 'platform_admin';

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingContributionId || !reviewReason.trim() || isSubmitting) return;
    setFeedback(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'review_contribution',
          payload: {
            contributionId: reviewingContributionId,
            reviewerId: currentUser.id,
            decision: reviewDecision,
            reason: reviewReason
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', text: data.error || 'Failed to submit review decision.' });
        return;
      }
      setReviewingContributionId(null);
      setReviewReason('');
      setFeedback({ type: 'success', text: `Contribution marked as "${reviewDecision}". Contributor notified.` });
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Network error submitting review.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResubmitRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resubmittingId || !resubmitUrl.trim() || isSubmitting) return;
    setFeedback(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'resubmit_contribution',
          payload: {
            contributionId: resubmittingId,
            evidenceUrl: resubmitUrl.trim(),
            description: resubmitDesc.trim()
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', text: data.error || 'Failed to resubmit revised contribution.' });
        return;
      }
      setResubmittingId(null);
      setResubmitUrl('');
      setResubmitDesc('');
      setFeedback({
        type: 'success',
        text: isRtl ? 'تمت إعادة إرسال المساهمة بالأدلة المحدثة للمراجعة.' : 'Contribution resubmitted with updated evidence for peer review.'
      });
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Network error resubmitting contribution.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveDisputeContribId || !disputeReason.trim() || isSubmitting) return;
    setFeedback(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'file_dispute',
          payload: {
            communityId: community.id,
            contributionId: effectiveDisputeContribId,
            filedById: currentUser.id,
            reason: disputeReason,
            evidenceLinks: []
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', text: data.error || 'Failed to file Community Shield dispute.' });
        return;
      }
      setIsFilingDispute(false);
      setDisputeReason('');
      setFeedback({ type: 'success', text: 'Formal Community Shield dispute submitted cleanly.' });
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Network error filing dispute.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAppealDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealingDisputeId || !appealReason.trim() || isSubmitting) return;
    setFeedback(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'appeal_dispute',
          payload: {
            disputeId: appealingDisputeId,
            appealReason: appealReason.trim()
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', text: data.error || 'Failed to submit dispute appeal.' });
        return;
      }
      setAppealingDisputeId(null);
      setAppealReason('');
      setFeedback({
        type: 'success',
        text: isRtl ? 'تم رفع استئناف النزاع إلى مجلس المراجعة بنجاح.' : 'Dispute appeal submitted to Community Shield.'
      });
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Network error appealing dispute.' });
    } finally {
      setIsSubmitting(false);
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
      {/* Subnav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('contributions')}
            className={`pb-2 transition-colors ${
              activeSubTab === 'contributions' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Contribution Ledger ({contributions.length})
          </button>
          <button
            onClick={() => setActiveSubTab('attestations')}
            className={`pb-2 transition-colors ${
              activeSubTab === 'attestations' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            TrustGraph Attestations ({attestations.length})
          </button>
          <button
            onClick={() => setActiveSubTab('disputes')}
            className={`pb-2 transition-colors ${
              activeSubTab === 'disputes' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Community Shield ({disputes.length})
          </button>
        </div>

        {activeSubTab === 'disputes' && (
          <button
            onClick={() => setIsFilingDispute(true)}
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 shrink-0"
          >
            <AlertOctagon className="h-3.5 w-3.5" />
            <span>Escalate Dispute</span>
          </button>
        )}
      </div>

      {/* SubTab 1: Contribution Ledger */}
      {activeSubTab === 'contributions' && (
        <div className="space-y-4">
          {/* Review Drawer Modal */}
          {reviewingContributionId && (
            <form onSubmit={handleReview} className="rounded-xl border border-indigo-600/60 bg-indigo-950/20 p-5 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-400" />
                <span>Auditing Contribution Review & Verification</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Decision</label>
                  <select
                    value={reviewDecision}
                    onChange={(e) => setReviewDecision(e.target.value as any)}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white capitalize"
                  >
                    <option value="verified">{isRtl ? 'معتمد (موثق)' : 'Verified (Approved with dual signoff)'}</option>
                    <option value="revision_requested">{isRtl ? 'طلب تعديل / أدلة إضافية' : 'Request Revision (More evidence needed)'}</option>
                    <option value="rejected">{isRtl ? 'مرفوض (أدلة غير كافية)' : 'Rejected (Insufficient evidence)'}</option>
                    <option value="disputed">{isRtl ? 'متنازع عليه' : 'Disputed (Contested claims)'}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Reviewer Identity</label>
                  <input
                    type="text"
                    disabled
                    value={`${currentUser.name} (${currentUser.id})`}
                    className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">
                  Mandatory Audit Rationale <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  placeholder="Detail the evidence verified, git commit or deliverables inspected..."
                  className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReviewingContributionId(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? (isRtl ? 'جاري الحفظ...' : 'Submitting...') : (isRtl ? 'تأكيد قرار المراجعة' : 'Confirm Official Review Decision')}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {contributions.map((cnt) => {
              const member = users.find((u) => u.id === cnt.memberId);
              const cat = community.contributionCategories.find((c) => c.id === cnt.categoryId);
              return (
                <div key={cnt.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {cnt.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                        <span>By {member?.name || cnt.memberId}</span>
                        <span>·</span>
                        <span>{cat?.name || cnt.categoryId}</span>
                        <span>·</span>
                        <span className="font-mono text-[11px]">{new Date(cnt.submissionDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-mono capitalize px-2.5 py-0.5 rounded ${
                        cnt.reviewStatus === 'verified'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                          : cnt.reviewStatus === 'disputed'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800/40'
                          : 'bg-amber-950 text-amber-300 border border-amber-800/40'
                      }`}
                    >
                      {cnt.reviewStatus}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {cnt.description}
                  </p>

                  {/* Evidence links */}
                  {cnt.evidence.length > 0 && (
                    <div className="flex flex-wrap gap-2 text-xs bg-slate-800/30 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400 font-medium">Attached Evidence:</span>
                      {cnt.evidence.map((evi) => (
                        <a
                          key={evi.id}
                          href={evi.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>{evi.description || evi.url}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Decision rationale if reviewed */}
                  {cnt.decisionReason && (
                    <div className="text-xs text-slate-400 border-s-2 border-indigo-500 ps-3 py-0.5 italic">
                      Review Decision ({cnt.reviewerId}): &quot;{cnt.decisionReason}&quot;
                    </div>
                  )}

                  {/* Resubmit form if revision_requested for contributor */}
                  {resubmittingId === cnt.id && (
                    <form onSubmit={handleResubmitRevision} className="rounded-lg border border-amber-500/40 bg-amber-950/20 p-3.5 space-y-2.5">
                      <div className="text-xs font-semibold text-amber-200">
                        {isRtl ? 'إعادة إرسال المساهمة بالأدلة المعدّلة' : 'Resubmit with Updated Evidence'}
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-300 block mb-1">
                          {isRtl ? 'رابط الدليل المحدث' : 'Revised Evidence URL'} <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="url"
                          required
                          value={resubmitUrl}
                          onChange={(e) => setResubmitUrl(e.target.value)}
                          placeholder="https://github.com/..."
                          className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-300 block mb-1">
                          {isRtl ? 'ملاحظات التعديل' : 'Revision Notes'}
                        </label>
                        <textarea
                          rows={2}
                          value={resubmitDesc}
                          onChange={(e) => setResubmitDesc(e.target.value)}
                          placeholder={isRtl ? 'صف التعديلات والأدلة الجديدة...' : 'Describe what was updated...'}
                          className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-xs text-white"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setResubmittingId(null)}
                          className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                        >
                          {isRtl ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
                        >
                          {isSubmitting ? '...' : (isRtl ? 'إعادة الإرسال للمراجعة' : 'Resubmit for Review')}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Review Button if pending / disputed OR Resubmit if revision_requested */}
                  {(cnt.reviewStatus === 'pending' || cnt.reviewStatus === 'disputed' || (cnt.reviewStatus === 'revision_requested' && cnt.memberId === currentUser.id)) && (
                    <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-800">
                      {cnt.reviewStatus === 'revision_requested' && cnt.memberId === currentUser.id && resubmittingId !== cnt.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setResubmittingId(cnt.id);
                            setResubmitUrl(cnt.evidence?.[0]?.url || '');
                            setResubmitDesc(cnt.description || '');
                          }}
                          className="flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500"
                        >
                          <span>{isRtl ? 'تعديل وإعادة إرسال' : 'Update & Resubmit Revision'}</span>
                        </button>
                      )}
                      {(cnt.reviewStatus === 'pending' || cnt.reviewStatus === 'disputed') && (
                        canReview ? (
                          <button
                            onClick={() => {
                              setReviewingContributionId(cnt.id);
                              setReviewReason('');
                            }}
                            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>{isRtl ? 'مراجعة واعتماد' : 'Perform Review & Signoff'}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-400">
                            {isRtl ? 'بانتظار مراجعة المشرف / المالك' : 'Awaiting reviewer / owner verification'}
                          </span>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SubTab 2: Mutual Attestation (MOD-3) */}
      {activeSubTab === 'attestations' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            MOD-3 requires explicit mutual confirmation from both the delivery party and the receiving party. Silence is never treated as consent.
          </p>

          <div className="space-y-3">
            {attestations.map((att) => {
              const party1 = users.find((u) => u.id === att.partyOneId);
              const party2 = users.find((u) => u.id === att.partyTwoId);
              return (
                <div key={att.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      {att.relatedObjective}
                    </h4>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded">
                      Consensus: {att.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Party 1 */}
                    <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between font-semibold text-slate-200">
                        <span>{party1?.name || att.partyOneId} (Executor)</span>
                        {att.partyOneConfirmed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-slate-500" />
                        )}
                      </div>
                      <p className="text-slate-400 italic">
                        &quot;{att.partyOneStatement}&quot;
                      </p>
                    </div>

                    {/* Party 2 */}
                    <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between font-semibold text-slate-200">
                        <span>{party2?.name || att.partyTwoId} (Beneficiary)</span>
                        {att.partyTwoConfirmed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-slate-500" />
                        )}
                      </div>
                      <p className="text-slate-400 italic">
                        &quot;{att.partyTwoStatement}&quot;
                      </p>
                    </div>
                  </div>

                  {att.resolutionNotes && (
                    <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                      {att.resolutionNotes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SubTab 3: Community Shield (Disputes & Appeals) */}
      {activeSubTab === 'disputes' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Community Shield provides a transparent dispute resolution center with immutable audit trails. Administrators cannot silently erase verified history.
          </p>

          {isFilingDispute && (
            <form onSubmit={handleFileDispute} className="rounded-xl border border-rose-800/60 bg-rose-950/20 p-5 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <AlertOctagon className="h-4 w-4 text-rose-400" />
                <span>File Formal Community Shield Disagreement</span>
              </h4>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Select Disputed Contribution</label>
                <select
                  value={effectiveDisputeContribId}
                  onChange={(e) => setDisputeContribId(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                >
                  {contributions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Reason & Contested Deliverables</label>
                <textarea
                  required
                  rows={3}
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Explain why the deliverable does not match the acceptance criteria..."
                  className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFilingDispute(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
                >
                  Submit Dispute to Shield
                </button>
              </div>
            </form>
          )}

          {disputes.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-8 text-center text-xs text-slate-400">
              Zero active disputes. All community outcomes in good standing.
            </div>
          ) : (
            <div className="space-y-3">
              {disputes.map((d) => (
                <div key={d.id} className="rounded-xl border border-rose-900/40 bg-rose-950/10 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Dispute on Contribution {d.contributionId}</span>
                    <span className="text-[11px] font-mono capitalize text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded">
                      {d.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{d.reason}</p>
                  {d.resolutionNotes && (
                    <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-2.5 text-xs text-emerald-200">
                      <strong>{isRtl ? 'القرار:' : 'Resolution:'}</strong> {d.resolutionNotes}
                    </div>
                  )}
                  {appealingDisputeId === d.id && (
                    <form onSubmit={handleAppealDispute} className="rounded-lg border border-amber-500/40 bg-slate-950/80 p-3 space-y-2">
                      <label className="text-[11px] text-slate-300 block">
                        {isRtl ? 'سبب الاستئناف' : 'Appeal Justification'} <span className="text-rose-400">*</span>
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={appealReason}
                        onChange={(e) => setAppealReason(e.target.value)}
                        placeholder={isRtl ? 'اشرح سبب طلب إعادة النظر...' : 'Explain why this ruling or dispute requires escalation...'}
                        className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-xs text-white"
                      />
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setAppealingDisputeId(null)} className="px-2.5 py-1 text-xs text-slate-400 hover:text-white">
                          {isRtl ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
                        >
                          {isSubmitting ? '...' : (isRtl ? 'إرسال الاستئناف' : 'Submit Appeal')}
                        </button>
                      </div>
                    </form>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    <span>Filed by {d.filedById} on {new Date(d.createdAt).toLocaleDateString()}</span>
                    {d.status !== 'appealed' && appealingDisputeId !== d.id && (
                      <button
                        type="button"
                        onClick={() => {
                          setAppealingDisputeId(d.id);
                          setAppealReason('');
                        }}
                        className="rounded-md border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300"
                      >
                        {isRtl ? 'استئناف القرار' : 'Appeal Dispute'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
