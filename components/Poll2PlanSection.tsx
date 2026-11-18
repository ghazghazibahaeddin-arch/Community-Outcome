'use client';

import React, { useState } from 'react';
import { translations } from '@/lib/i18n';
import { Poll, Commitment, Community, User, Language } from '@/lib/types';
import { Vote, ArrowRight, ShieldCheck, Plus, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface Poll2PlanSectionProps {
  polls: Poll[];
  commitments: Commitment[];
  community: Community;
  currentUser: User;
  users: User[];
  lang: Language;
  onRefresh: () => void;
}

export const Poll2PlanSection: React.FC<Poll2PlanSectionProps> = ({
  polls,
  commitments,
  community,
  currentUser,
  users,
  lang,
  onRefresh
}) => {
  const t = translations[lang];

  const [activeSubTab, setActiveSubTab] = useState<'polls' | 'commitments'>('polls');

  // New Poll Form
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollAlternatives, setPollAlternatives] = useState('');

  // Convert to Plan Form
  const [convertingPollId, setConvertingPollId] = useState<string | null>(null);
  const [planTitle, setPlanTitle] = useState('');
  const [planOutcome, setPlanOutcome] = useState('');

  // New Commitment Form
  const [isCreatingCommitment, setIsCreatingCommitment] = useState(false);
  const [agreedWhat, setAgreedWhat] = useState('');
  const [expectingDelivery, setExpectingDelivery] = useState(users[0]?.id || 'usr_sarah');
  const [commitmentDeadline, setCommitmentDeadline] = useState('2026-11-20');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleVote = async (pollId: string, alternativeId: string) => {
    setFeedback(null);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'cast_vote',
          payload: { pollId, alternativeId, userId: currentUser.id }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', text: data.error || 'Failed to record vote.' });
        return;
      }
      setFeedback({ type: 'success', text: 'Vote recorded.' });
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Network error recording vote.' });
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollQuestion.trim()) return;
    setFeedback(null);

    const alts = pollAlternatives
      .split(',')
      .map((s, idx) => ({ id: `alt_${idx + 1}_${Date.now()}`, text: s.trim(), votes: [] }))
      .filter((a) => a.text.length > 0);

    if (alts.length < 2) {
      setFeedback({ type: 'error', text: 'Please enter at least 2 comma-separated alternatives.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'create_poll',
          payload: {
            communityId: community.id,
            creatorId: currentUser.id,
            question: pollQuestion,
            alternatives: alts
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', text: data.error || 'Failed to launch decision poll.' });
        return;
      }
      setIsCreatingPoll(false);
      setPollQuestion('');
      setPollAlternatives('');
      setFeedback({ type: 'success', text: 'Decision poll launched cleanly.' });
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Network error launching poll.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConvertToPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingPollId || !planTitle.trim()) return;
    setFeedback(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'convert_poll_to_plan',
          payload: {
            pollId: convertingPollId,
            leadOwnerId: currentUser.id,
            planTitle,
            agreedOutcome: planOutcome
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', text: data.error || 'Failed to convert poll into execution plan.' });
        return;
      }
      setConvertingPollId(null);
      setPlanTitle('');
      setPlanOutcome('');
      setFeedback({ type: 'success', text: 'Poll closed and QuestLoop execution plan created!' });
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Network error converting poll to plan.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCommitment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedWhat.trim()) return;
    setFeedback(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'create_commitment',
          payload: {
            communityId: community.id,
            agreedWhat,
            committedById: currentUser.id,
            expectingDeliveryId: expectingDelivery,
            deadline: new Date(commitmentDeadline).toISOString(),
            status: 'active',
            history: [{ timestamp: new Date().toISOString(), note: 'Formal commitment logged.', authorId: currentUser.id }]
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', text: data.error || 'Failed to log commitment.' });
        return;
      }
      setIsCreatingCommitment(false);
      setAgreedWhat('');
      setFeedback({ type: 'success', text: 'Explicit commitment logged in PromiseGraph!' });
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Network error logging commitment.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`rounded-xl border p-3 text-xs flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
              : 'border-rose-500/40 bg-rose-950/40 text-rose-300'
          }`}
        >
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white px-1">✕</button>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveSubTab('polls')}
            className={`pb-2 transition-colors ${
              activeSubTab === 'polls' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Poll2Plan Decisions ({polls.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('commitments')}
            className={`pb-2 transition-colors ${
              activeSubTab === 'commitments' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            PromiseGraph Commitments ({commitments.length})
          </button>
        </div>

        {activeSubTab === 'polls' ? (
          <button
            type="button"
            onClick={() => setIsCreatingPoll(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Launch Decision Poll</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsCreatingCommitment(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Record Explicit Commitment</span>
          </button>
        )}
      </div>

      {/* SubTab 1: Poll2Plan */}
      {activeSubTab === 'polls' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Poll2Plan converts community democratic votes directly into trackable execution plans with assignees and checklists.
          </p>

          {isCreatingPoll && (
            <form onSubmit={handleCreatePoll} className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 space-y-3">
              <h4 className="text-xs font-bold text-white">Create Decision Poll</h4>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Decision Question</label>
                <input
                  type="text"
                  required
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="e.g. Standardize on Webhook vs WebSocket architecture?"
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Alternatives (comma separated, min 2)</label>
                <input
                  type="text"
                  required
                  value={pollAlternatives}
                  onChange={(e) => setPollAlternatives(e.target.value)}
                  placeholder="e.g. Webhook Architecture (Serverless), Persistent WebSocket Gateway"
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingPoll(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Launch Poll'}
                </button>
              </div>
            </form>
          )}

          {/* Converting Drawer */}
          {convertingPollId && (
            <form onSubmit={handleConvertToPlan} className="rounded-xl border border-indigo-600/60 bg-indigo-950/20 p-4 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <ArrowRight className="h-3.5 w-3.5 text-indigo-400" />
                <span>Convert Poll Decision into Execution Plan</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Execution Plan Title</label>
                  <input
                    type="text"
                    required
                    value={planTitle}
                    onChange={(e) => setPlanTitle(e.target.value)}
                    placeholder="e.g. Webhook Standardization Migration"
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Agreed Outcome Statement</label>
                  <input
                    type="text"
                    required
                    value={planOutcome}
                    onChange={(e) => setPlanOutcome(e.target.value)}
                    placeholder="e.g. All bot integrations migrated with zero downtime."
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConvertingPollId(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Generating...' : 'Generate Plan & Tasks'}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {polls.map((poll) => {
              const totalVotes = poll.alternatives.reduce((acc, a) => acc + a.votes.length, 0);
              return (
                <div key={poll.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-white">
                      {lang === 'ar' && poll.questionAr ? poll.questionAr : poll.question}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">
                        {totalVotes} verified votes
                      </span>
                      <span
                        className={`text-[11px] font-mono capitalize px-2 py-0.5 rounded ${
                          poll.status === 'closed'
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                        }`}
                      >
                        {poll.status}
                      </span>
                    </div>
                  </div>

                  {/* Alternatives & Voting */}
                  <div className="space-y-2">
                    {poll.alternatives.map((alt) => {
                      const votePct = totalVotes > 0 ? Math.round((alt.votes.length / totalVotes) * 100) : 0;
                      const hasVoted = alt.votes.includes(currentUser.id);
                      const isWinner = poll.winningAlternativeId === alt.id;
                      return (
                        <div
                          key={alt.id}
                          onClick={() => poll.status === 'open' && handleVote(poll.id, alt.id)}
                          className={`relative overflow-hidden rounded-lg border p-3 transition-colors ${
                            isWinner
                              ? 'border-indigo-500 bg-indigo-950/30'
                              : hasVoted
                              ? 'border-emerald-600/50 bg-emerald-950/20'
                              : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                          } ${poll.status === 'open' ? 'cursor-pointer' : ''}`}
                        >
                          {/* Visual progress bar */}
                          <div
                            className="absolute inset-y-0 left-0 bg-indigo-600/10 transition-all"
                            style={{ width: `${votePct}%` }}
                          />
                          <div className="relative flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-slate-200">
                              {alt.text}
                            </span>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-xs font-mono text-indigo-400 tabular-nums">
                                {alt.votes.length} ({votePct}%)
                              </span>
                              {isWinner && (
                                <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded">
                                  Winning Decision
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer & Conversion to Plan */}
                  <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-800">
                    <span className="text-slate-500 text-[11px]">
                      Created by {poll.creatorId} · {new Date(poll.createdAt).toLocaleDateString()}
                    </span>
                    {poll.status === 'open' && (
                      <button
                        type="button"
                        onClick={() => {
                          setConvertingPollId(poll.id);
                          setPlanTitle(poll.question);
                        }}
                        className="flex items-center gap-1.5 font-semibold text-indigo-400 hover:text-indigo-300"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        <span>Convert Decision to Execution Plan</span>
                      </button>
                    )}
                    {poll.executionPlanId && (
                      <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        <span>Linked to Execution Plan {poll.executionPlanId}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SubTab 2: PromiseGraph Commitments */}
      {activeSubTab === 'commitments' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            PromiseGraph isolates explicit member-to-member or organizer-to-member agreements from casual conversation.
          </p>

          {isCreatingCommitment && (
            <form onSubmit={handleCreateCommitment} className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 space-y-3">
              <h4 className="text-xs font-bold text-white">Record Formal Promise / Commitment</h4>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">What Was Explicitly Agreed</label>
                <textarea
                  required
                  rows={2}
                  value={agreedWhat}
                  onChange={(e) => setAgreedWhat(e.target.value)}
                  placeholder="State the concrete deliverable and expectations..."
                  className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Expecting Delivery</label>
                  <select
                    value={expectingDelivery}
                    onChange={(e) => setExpectingDelivery(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.passport.displayName})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Delivery Deadline</label>
                  <input
                    type="date"
                    value={commitmentDeadline}
                    onChange={(e) => setCommitmentDeadline(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingCommitment(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Log Commitment'}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {commitments.map((com) => {
              const committedUser = users.find((u) => u.id === com.committedById);
              const expectingUser = users.find((u) => u.id === com.expectingDeliveryId);
              return (
                <div key={com.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                      <span>{committedUser?.name || com.committedById}</span>
                      <span className="text-slate-500 font-normal">committed to</span>
                      <span>{expectingUser?.name || com.expectingDeliveryId}</span>
                    </div>
                    <span
                      className={`text-[11px] font-mono capitalize px-2 py-0.5 rounded ${
                        com.status === 'fulfilled'
                          ? 'bg-emerald-950 text-emerald-300'
                          : com.status === 'active'
                          ? 'bg-indigo-950 text-indigo-300'
                          : 'bg-rose-950 text-rose-300'
                      }`}
                    >
                      {com.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {com.agreedWhat}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-500" />
                      <span>Deadline: {new Date(com.deadline).toLocaleDateString()}</span>
                    </span>
                    <span>{com.history.length} audit entry(s)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
