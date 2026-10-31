'use client';

import React, { useState } from 'react';
import { translations } from '@/lib/i18n';
import { Contribution, MutualAttestation, Dispute, Community, User, Language } from '@/lib/types';
import { ShieldCheck, AlertOctagon, CheckCircle2, XCircle, FileText, ExternalLink, Plus, MessageSquare } from 'lucide-react';

interface TrustGraphSectionProps {
  contributions: Contribution[];
  attestations: MutualAttestation[];
  disputes: Dispute[];
  community: Community;
  currentUser: User;
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
  users,
  lang,
  onRefresh
}) => {
  const t = translations[lang];

  const [activeSubTab, setActiveSubTab] = useState<'contributions' | 'attestations' | 'disputes'>('contributions');

  // Review Drawer State
  const [reviewingContributionId, setReviewingContributionId] = useState<string | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'verified' | 'rejected' | 'disputed'>('verified');
  const [reviewReason, setReviewReason] = useState('');

  // File Dispute State
  const [isFilingDispute, setIsFilingDispute] = useState(false);
  const [disputeContribId, setDisputeContribId] = useState(contributions[0]?.id || '');
  const [disputeReason, setDisputeReason] = useState('');

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingContributionId || !reviewReason.trim()) return;

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      if (data.success) {
        setReviewingContributionId(null);
        setReviewReason('');
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
    }
  };

  const handleFileDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeContribId || !disputeReason.trim()) return;

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'file_dispute',
          payload: {
            communityId: community.id,
            contributionId: disputeContribId,
            filedById: currentUser.id,
            reason: disputeReason,
            evidenceLinks: []
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsFilingDispute(false);
        setDisputeReason('');
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to file dispute:', err);
    }
  };

  return (
    <div className="space-y-6">
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
                    <option value="verified">Verified (Approved with dual signoff)</option>
                    <option value="rejected">Rejected (Insufficient evidence)</option>
                    <option value="disputed">Disputed (Contested claims)</option>
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
                <label className="text-[11px] text-slate-300 block mb-1">Mandatory Audit Rationale</label>
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
                  className="rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Confirm Official Review Decision
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
                    <div className="text-xs text-slate-400 border-l-2 border-indigo-500 pl-3 py-0.5 italic">
                      Review Decision ({cnt.reviewerId}): &quot;{cnt.decisionReason}&quot;
                    </div>
                  )}

                  {/* Review Button if pending */}
                  {cnt.reviewStatus === 'pending' && (
                    <div className="flex justify-end pt-2 border-t border-slate-800">
                      <button
                        onClick={() => {
                          setReviewingContributionId(cnt.id);
                          setReviewReason('');
                        }}
                        className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Perform Review & Signoff</span>
                      </button>
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
                  value={disputeContribId}
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
                  <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    Filed by {d.filedById} on {new Date(d.createdAt).toLocaleDateString()}
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
