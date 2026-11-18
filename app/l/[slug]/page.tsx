'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CommunityLink,
  Community,
  NeedSignalRequest,
  PlanTask,
  Offer,
  User
} from '@/lib/types';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Send,
  AlertTriangle,
  RefreshCw,
  ClipboardList,
  HandHelping,
  Plus,
  Sparkles,
  ExternalLink,
  Link2,
  UserCheck,
  Clock
} from 'lucide-react';

type HubTab = 'requests' | 'tasks' | 'action';

export default function ActionLinkPage() {
  const params = useParams();
  const router = useRouter();
  const rawSlug = params?.slug;
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : (rawSlug as string) || '';

  const [link, setLink] = useState<CommunityLink | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<NeedSignalRequest[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [activeTab, setActiveTab] = useState<HubTab>('requests');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Action link form state
  const [inputText, setInputText] = useState('');

  // Inline Offer Help state
  const [offerRequestId, setOfferRequestId] = useState<string | null>(null);
  const [offerProposal, setOfferProposal] = useState('');
  const [offerTimeline, setOfferTimeline] = useState('2-3 days');

  // Inline Create Help Request state
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [newReqTitle, setNewReqTitle] = useState('');
  const [newReqDescription, setNewReqDescription] = useState('');
  const [newReqPriority, setNewReqPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');

  // Inline Complete Task state
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState('https://github.com/');
  const [completionSummary, setCompletionSummary] = useState('');

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 4500);
  }, []);

  const loadHubState = useCallback(
    async (silent = false, recordVisit = false) => {
      if (!slug) return;
      if (!silent) setIsSyncing(true);

      try {
        const res = await fetch('/api/data?communityId=all', {
          credentials: 'include',
          cache: 'no-store'
        });
        const json = (await res.json()) as any;
        if (!json.success || !json.data) {
          setErrorMsg(json.error || 'Failed to load Community Hub state.');
          return;
        }

        const allLinks: CommunityLink[] = json.data.links || [];
        const allCommunities: Community[] = json.data.communities || [];
        const allRequests: NeedSignalRequest[] = json.data.requests || [];
        const allOffers: Offer[] = json.data.offers || [];
        const allTasks: PlanTask[] = json.data.tasks || [];
        const allUsers: User[] = json.data.users || [];

        setUsers(allUsers);
        setAuthUser(json.data.authUser || null);

        const slugLower = slug.toLowerCase();
        // 1. Exact link match
        let resolvedLink: CommunityLink | null =
          allLinks.find((l) => l.slug.toLowerCase() === slugLower) || null;

        let resolvedComm: Community | null = resolvedLink
          ? allCommunities.find((c) => c.id === resolvedLink!.communityId) || null
          : null;

        // 2. Smart alias resolution (handles `${community.slug}-hub`, `${community.id}-hub`, etc.)
        if (!resolvedLink) {
          const normalized = slugLower.replace(/-(action-)?hub$/, '');
          resolvedComm =
            allCommunities.find((c) => {
              const cSlug = (c.slug || '').toLowerCase();
              const cId = c.id.toLowerCase();
              return (
                cSlug === slugLower ||
                cSlug === normalized ||
                cId === slugLower ||
                cId === normalized ||
                `${cSlug}-hub` === slugLower ||
                `${cSlug}-action-hub` === slugLower ||
                `${cId}-hub` === slugLower
              );
            }) || null;

          if (resolvedComm) {
            resolvedLink =
              allLinks.find(
                (l) =>
                  l.communityId === resolvedComm!.id &&
                  l.linkType === 'hub_multipurpose' &&
                  !l.isRevoked
              ) || {
                id: `virtual_hub_${resolvedComm.id}`,
                communityId: resolvedComm.id,
                linkType: 'hub_multipurpose',
                slug,
                title: `${resolvedComm.name} Action Hub`,
                description:
                  resolvedComm.description ||
                  'Central synchronized Action Hub for NeedSignal help requests, QuestLoop tasks, and verified outcomes.',
                audience: 'public',
                stats: { visits: 0, starts: 0, submissions: 0, completions: 0, verifiedOutcomes: 0 },
                createdAt: resolvedComm.createdAt,
                isRevoked: false
              };
          }
        }

        setLink(resolvedLink);
        setCommunity(resolvedComm);

        if (resolvedComm) {
          setRequests(allRequests.filter((r) => r.communityId === resolvedComm!.id));
          setOffers(allOffers.filter((o) => o.communityId === resolvedComm!.id));
          setTasks(allTasks.filter((t) => t.communityId === resolvedComm!.id));
        }

        if (recordVisit && resolvedLink && !resolvedLink.isRevoked && !resolvedLink.id.startsWith('virtual_hub_')) {
          if (
            resolvedLink.linkType === 'link_18_task_card' ||
            resolvedLink.linkType === 'link_7_bounties' ||
            resolvedLink.linkType === 'link_13_checklist'
          ) {
            setActiveTab('tasks');
          } else if (
            resolvedLink.linkType === 'link_24_issue_report' ||
            resolvedLink.linkType === 'link_14_evidence' ||
            resolvedLink.linkType === 'link_22_single_contribution'
          ) {
            setActiveTab('action');
          } else {
            setActiveTab('requests');
          }

          fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              action: 'record_link_event',
              payload: { linkId: resolvedLink.id, eventType: 'visit' }
            })
          }).catch(() => {});
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Network error loading Action Hub.');
      } finally {
        setIsLoading(false);
        setIsSyncing(false);
      }
    },
    [slug]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      loadHubState(true, true);
    }, 0);
    return () => clearTimeout(timer);
  }, [loadHubState]);

  // Real-time background sync with Telegram & Web Platform
  useEffect(() => {
    const refreshIfVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadHubState(true, false);
      }
    };
    const interval = setInterval(refreshIfVisible, 10000);
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        loadHubState(true, false);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [loadHubState]);

  const userMap = useMemo(() => {
    const map = new Map<string, User>();
    users.forEach((u) => map.set(u.id, u));
    return map;
  }, [users]);

  const openRequests = useMemo(
    () => requests.filter((r) => r.status === 'open' || r.status === 'receiving_offers' || r.status === 'in_progress'),
    [requests]
  );

  const activeTasks = useMemo(() => tasks.filter((t) => t.status !== 'completed'), [tasks]);

  const handleSubmitOffer = async (reqItem: NeedSignalRequest) => {
    if (!community) return;
    const proposal = offerProposal.trim() || `Ready to assist with "${reqItem.title}" and coordinate delivery.`;
    setBusyItemId(reqItem.id);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'submit_offer',
          payload: {
            requestId: reqItem.id,
            communityId: community.id,
            memberId: authUser?.id || 'usr_alex',
            proposedHelp: proposal,
            timeline: offerTimeline.trim() || '2-3 days'
          }
        })
      });
      const json = (await res.json()) as any;
      if (!res.ok || !json.success) {
        setErrorMsg(json.error || 'Failed to submit assistance offer.');
        return;
      }
      setOfferRequestId(null);
      setOfferProposal('');
      showToast(`Offer sent for "${reqItem.title}" & synced across Telegram + Web.`);
      await loadHubState(true, false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error submitting offer.');
    } finally {
      setBusyItemId(null);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!community || !newReqTitle.trim()) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'create_request',
          payload: {
            communityId: community.id,
            creatorId: authUser?.id || 'usr_sarah',
            title: newReqTitle.trim(),
            description: newReqDescription.trim() || 'Submitted via Community Action Hub',
            category: community.contributionCategories?.[0]?.id || 'cat_core',
            skillsRequired: ['Community Collaboration'],
            priority: newReqPriority,
            deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
            status: 'open',
            visibility: 'community'
          }
        })
      });
      const json = (await res.json()) as any;
      if (!res.ok || !json.success) {
        setErrorMsg(json.error || 'Failed to create request.');
        return;
      }
      setNewReqTitle('');
      setNewReqDescription('');
      setShowNewRequestForm(false);
      showToast('Help request published & synced live to Telegram, Discord & Web.');
      await loadHubState(true, false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error creating request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaimTask = async (taskItem: PlanTask) => {
    setBusyItemId(taskItem.id);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'claim_task',
          payload: {
            taskId: taskItem.id,
            userId: authUser?.id || 'usr_alex'
          }
        })
      });
      const json = (await res.json()) as any;
      if (!res.ok || !json.success) {
        setErrorMsg(json.error || 'Failed to claim task.');
        return;
      }
      showToast(`Claimed "${taskItem.title}" & synced with QuestLoop.`);
      await loadHubState(true, false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error claiming task.');
    } finally {
      setBusyItemId(null);
    }
  };

  const handleCompleteTask = async (taskItem: PlanTask) => {
    setBusyItemId(taskItem.id);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'complete_task',
          payload: {
            taskId: taskItem.id,
            memberId: authUser?.id || taskItem.assigneeId || 'usr_alex',
            evidenceUrl: evidenceUrl.trim() || 'https://github.com/deliverable',
            description: completionSummary.trim() || `Completed "${taskItem.title}" via Synced Action Hub`
          }
        })
      });
      const json = (await res.json()) as any;
      if (!res.ok || !json.success) {
        setErrorMsg(json.error || 'Failed to submit deliverable.');
        return;
      }
      setCompletingTaskId(null);
      setCompletionSummary('');
      showToast(`Deliverable verified & logged for "${taskItem.title}".`);
      await loadHubState(true, false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error completing task.');
    } finally {
      setBusyItemId(null);
    }
  };

  const handleSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!link) return;
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (!link.id.startsWith('virtual_hub_')) {
        const res = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            action: 'record_link_event',
            payload: { linkId: link.id, eventType: 'submission' }
          })
        });
        const json = (await res.json()) as any;
        if (!res.ok || !json.success) {
          setErrorMsg(json.error || 'Failed to record submission.');
          return;
        }
      }
      setIsSubmitted(true);
      setInputText('');
      showToast('Action recorded & synced across channels.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error submitting action.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090d16] text-white flex items-center justify-center">
        <div className="flex items-center gap-2.5 text-xs font-mono text-slate-400">
          <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
          <span>Syncing Community Action Hub...</span>
        </div>
      </div>
    );
  }

  if (!link || link.isRevoked || !community) {
    return (
      <div className="min-h-screen bg-[#090d16] text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-center space-y-4">
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-400" />
          <h2 className="text-base font-bold">Link Inactive or Revoked</h2>
          <p className="text-xs text-slate-400">
            This action link has either expired or been revoked by the community owner.
          </p>
          <button
            onClick={() => router.push('/')}
            className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            Return to Community OS Hub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between p-4 sm:p-6">
      <div className="max-w-3xl mx-auto w-full space-y-4">
        {/* Top Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Open Full Workspace ({community.name})</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
              <Sparkles className="h-3 w-3" />
              <span>Telegram · Discord · Web Synced</span>
            </span>
            <button
              type="button"
              onClick={() => loadHubState(false, false)}
              disabled={isSyncing}
              className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Sync</span>
            </button>
          </div>
        </div>

        {/* Toast & Error Alerts */}
        {toastMsg && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/50 px-3.5 py-2.5 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3.5 py-2.5 text-xs text-rose-200">
            {errorMsg}
          </div>
        )}

        {/* Main Synchronized Action Hub Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-7 shadow-2xl space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-indigo-300 block">{community.name}</span>
                <h1 className="text-base sm:text-lg font-bold text-white leading-tight">{link.title}</h1>
              </div>
            </div>

            {authUser ? (
              <div className="inline-flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-800/70 px-3 py-1.5 text-xs">
                <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-slate-200 font-medium">{authUser.name}</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="/api/auth/telegram/authorize?redirect=true"
                  target="_top"
                  className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 transition-colors"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  <span>Sign In with Telegram</span>
                </a>
                <a
                  href="/api/discord/connect?mode=user&redirect=true"
                  target="_top"
                  className="inline-flex items-center gap-1.5 rounded-md border border-indigo-500/40 bg-indigo-600/20 px-3 py-1.5 text-xs font-semibold text-indigo-200 hover:bg-indigo-600/30 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Discord</span>
                </a>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">{link.description}</p>

          {/* Interactive Hub Tabs */}
          <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-semibold transition-colors ${
                activeTab === 'requests'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <HandHelping className="h-3.5 w-3.5 shrink-0" />
              <span>Requests ({openRequests.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-semibold transition-colors ${
                activeTab === 'tasks'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ClipboardList className="h-3.5 w-3.5 shrink-0" />
              <span>Tasks ({activeTasks.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('action')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-semibold transition-colors ${
                activeTab === 'action'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Send className="h-3.5 w-3.5 shrink-0" />
              <span>Quick Note</span>
            </button>
          </div>

          {/* TAB 1: NEEDSIGNAL REQUESTS */}
          {activeTab === 'requests' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Active NeedSignal Requests
                </h2>
                <button
                  type="button"
                  onClick={() => setShowNewRequestForm((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-600/20 border border-indigo-500/40 px-2.5 py-1 text-xs font-semibold text-indigo-300 hover:bg-indigo-600/30 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{showNewRequestForm ? 'Close' : 'New Request'}</span>
                </button>
              </div>

              {showNewRequestForm && (
                <form
                  onSubmit={handleCreateRequest}
                  className="rounded-xl border border-indigo-500/30 bg-slate-950/70 p-4 space-y-3"
                >
                  <div>
                    <label className="text-[11px] font-medium text-slate-300 block mb-1">
                      Help Request Title
                    </label>
                    <input
                      type="text"
                      required
                      value={newReqTitle}
                      onChange={(e) => setNewReqTitle(e.target.value)}
                      placeholder="e.g., Audit webhook payload & security"
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={newReqDescription}
                        onChange={(e) => setNewReqDescription(e.target.value)}
                        placeholder="Optional context or deliverables needed..."
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <select
                      value={newReqPriority}
                      onChange={(e) => setNewReqPriority(e.target.value as any)}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="urgent">Urgent Priority</option>
                    </select>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{isSubmitting ? 'Publishing...' : 'Publish Request'}</span>
                    </button>
                  </div>
                </form>
              )}

              {openRequests.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-6 text-center text-xs text-slate-400">
                  No open help requests right now in {community.name}. Use &ldquo;New Request&rdquo; above or{' '}
                  <code className="text-indigo-300">/help_request</code> in Telegram to create one.
                </div>
              ) : (
                <div className="space-y-3">
                  {openRequests.map((reqItem) => {
                    const reqOffers = offers.filter((o) => o.requestId === reqItem.id);
                    const creator = userMap.get(reqItem.creatorId);
                    const isOffering = offerRequestId === reqItem.id;

                    return (
                      <div
                        key={reqItem.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2.5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-bold text-white">{reqItem.title}</h3>
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                              {reqItem.description}
                            </p>
                          </div>
                          <span className="rounded border border-amber-500/30 bg-amber-950/40 px-2 py-0.5 text-[10px] font-mono uppercase text-amber-300">
                            {reqItem.priority}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-1">
                          <div className="flex items-center gap-3">
                            <span>By {creator?.name || 'Member'}</span>
                            <span>{reqOffers.length} offer(s)</span>
                            <span className="capitalize text-indigo-300">
                              {reqItem.status.replace('_', ' ')}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setOfferRequestId(isOffering ? null : reqItem.id);
                              setOfferProposal('');
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-600/20 border border-emerald-500/40 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/30 transition-colors"
                          >
                            <HandHelping className="h-3.5 w-3.5" />
                            <span>{isOffering ? 'Cancel' : 'Offer Help'}</span>
                          </button>
                        </div>

                        {isOffering && (
                          <div className="mt-2 pt-3 border-t border-slate-800 space-y-2">
                            <textarea
                              rows={2}
                              value={offerProposal}
                              onChange={(e) => setOfferProposal(e.target.value)}
                              placeholder="How can you help? Describe your deliverable..."
                              className="w-full rounded-md border border-slate-700 bg-slate-900 p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <input
                                type="text"
                                value={offerTimeline}
                                onChange={(e) => setOfferTimeline(e.target.value)}
                                placeholder="Timeline (e.g. 2 days)"
                                className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                              />
                              <button
                                type="button"
                                disabled={busyItemId === reqItem.id}
                                onClick={() => handleSubmitOffer(reqItem)}
                                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                              >
                                <Send className="h-3.5 w-3.5" />
                                <span>
                                  {busyItemId === reqItem.id ? 'Sending...' : 'Confirm Offer'}
                                </span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: QUESTLOOP TASKS */}
          {activeTab === 'tasks' && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Active QuestLoop Tasks & Bounties
              </h2>

              {activeTasks.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-6 text-center text-xs text-slate-400">
                  All tasks in {community.name} are completed!
                </div>
              ) : (
                <div className="space-y-3">
                  {activeTasks.map((taskItem) => {
                    const assignee = taskItem.assigneeId ? userMap.get(taskItem.assigneeId) : null;
                    const isCompleting = completingTaskId === taskItem.id;

                    return (
                      <div
                        key={taskItem.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2.5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-bold text-white">{taskItem.title}</h3>
                            <p className="text-xs text-slate-400 mt-0.5">{taskItem.description}</p>
                          </div>
                          <span className="rounded border border-indigo-500/30 bg-indigo-950/50 px-2 py-0.5 text-[10px] font-mono uppercase text-indigo-300">
                            {taskItem.status.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-1">
                          <div className="flex items-center gap-3">
                            <span>
                              Assignee:{' '}
                              <strong className="text-slate-200">
                                {assignee?.name || 'Open Bounty'}
                              </strong>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(taskItem.deadline).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {!taskItem.assigneeId && (
                              <button
                                type="button"
                                disabled={busyItemId === taskItem.id}
                                onClick={() => handleClaimTask(taskItem)}
                                className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                              >
                                <ClipboardList className="h-3.5 w-3.5" />
                                <span>
                                  {busyItemId === taskItem.id ? 'Claiming...' : 'Claim Task'}
                                </span>
                              </button>
                            )}
                            {taskItem.assigneeId && (
                              <button
                                type="button"
                                onClick={() =>
                                  setCompletingTaskId(isCompleting ? null : taskItem.id)
                                }
                                className="inline-flex items-center gap-1 rounded-md bg-emerald-600/20 border border-emerald-500/40 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/30"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>{isCompleting ? 'Cancel' : 'Mark Delivered'}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {isCompleting && (
                          <div className="mt-2 pt-3 border-t border-slate-800 space-y-2">
                            <input
                              type="url"
                              value={evidenceUrl}
                              onChange={(e) => setEvidenceUrl(e.target.value)}
                              placeholder="Evidence URL (PR, doc, screenshot link)..."
                              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <input
                                type="text"
                                value={completionSummary}
                                onChange={(e) => setCompletionSummary(e.target.value)}
                                placeholder="Short completion summary..."
                                className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                              />
                              <button
                                type="button"
                                disabled={busyItemId === taskItem.id}
                                onClick={() => handleCompleteTask(taskItem)}
                                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>
                                  {busyItemId === taskItem.id ? 'Submitting...' : 'Submit Deliverable'}
                                </span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DIRECT SUBMISSION / FEEDBACK */}
          {activeTab === 'action' && (
            <div className="pt-1">
              {isSubmitted ? (
                <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-6 text-center space-y-2">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Action Completed &amp; Persisted</h3>
                  <p className="text-xs text-slate-300">
                    Your submission is synchronized across Discord, Telegram, and the Community OS Workspace.
                  </p>
                  <div className="pt-2 flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSubmitted(false)}
                      className="rounded-md border border-slate-700 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
                    >
                      Submit Another
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/')}
                      className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                    >
                      Open in Workspace
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitAction} className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Submission Details / Intent Statement
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Provide your input, response, or evidence note..."
                      className="w-full rounded-md border border-slate-700 bg-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{isSubmitting ? 'Submitting...' : 'Submit Action'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Footer stats */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
            <span>Action URL: /l/{link.slug}</span>
            <span>
              {link.stats.visits} visits · {link.stats.submissions} responses
            </span>
          </div>
        </div>
      </div>

      <footer className="text-center py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-400 transition-colors font-mono"
        >
          <ShieldCheck className="h-4 w-4 text-indigo-400" />
          <span>
            Powered by <span className="font-bold text-slate-300">Community OS</span>
          </span>
        </Link>
      </footer>
    </div>
  );
}
