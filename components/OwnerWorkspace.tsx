'use client';

import React, { useState } from 'react';
import { translations } from '@/lib/i18n';
import {
  Community,
  NeedSignalRequest,
  Offer,
  PlanTask,
  Contribution,
  Dispute,
  KnowledgeArticle,
  CommunityLink,
  User,
  Language,
  OwnerActionItem,
  UserRole,
  DataMode
} from '@/lib/types';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Users,
  Settings,
  Bot,
  Layers,
  ArrowRight,
  Database,
  RefreshCw,
  Plus,
  ShieldCheck,
  Award,
  Send,
  Sparkles,
  CreditCard
} from 'lucide-react';
import { CommunityConnectionCenter } from './CommunityConnectionCenter';
import { PricingPlansSection } from './PricingPlansSection';
import { CommunitySubscription, PlanEntitlements } from '@/lib/types';

interface OwnerWorkspaceProps {
  community: Community;
  currentUser: User;
  currentUserRole?: UserRole;
  users: User[];
  requests: NeedSignalRequest[];
  offers: Offer[];
  tasks: PlanTask[];
  contributions: Contribution[];
  disputes: Dispute[];
  knowledge: KnowledgeArticle[];
  links: CommunityLink[];
  ownerActionItems: OwnerActionItem[];
  dataMode: DataMode;
  lang: Language;
  subscription?: CommunitySubscription;
  entitlements?: PlanEntitlements & {
    currentUsage: {
      membersCount: number;
      discordServersCount: number;
      telegramGroupsCount: number;
    };
  };
  onRefresh: () => void;
  onSelectTab: (tab: string) => void;
  onSwitchToMemberSpace?: () => void;
}

export const OwnerWorkspace: React.FC<OwnerWorkspaceProps> = ({
  community,
  currentUser,
  currentUserRole = 'community_owner',
  users,
  requests,
  offers,
  tasks,
  contributions,
  disputes,
  knowledge,
  links,
  ownerActionItems,
  dataMode,
  lang,
  subscription,
  entitlements,
  onRefresh,
  onSelectTab,
  onSwitchToMemberSpace
}) => {
  const t = translations[lang];

  const [activeSection, setActiveSection] = useState<'operations' | 'connect' | 'pricing' | 'requests' | 'reviews' | 'disputes' | 'roles' | 'config' | 'integrations'>('operations');

  // Role Management State
  const [selectedUserForRole, setSelectedUserForRole] = useState<string>(users[1]?.id || 'usr_alex');
  const [selectedRole, setSelectedRole] = useState<UserRole>('reviewer');
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleSuccess, setRoleSuccess] = useState<string | null>(null);

  // Review Drawer State
  const [reviewingContribId, setReviewingContribId] = useState<string | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'verified' | 'rejected' | 'disputed'>('verified');
  const [reviewReason, setReviewReason] = useState<string>('');

  // Mode Switch State
  const [isResettingData, setIsResettingData] = useState<boolean>(false);

  const pendingContributions = contributions.filter((c) => c.reviewStatus === 'pending');
  const openDisputes = disputes.filter((d) => d.status === 'open');
  const pendingOffers = offers.filter((o) => o.status === 'pending');

  const isOwnerOrAdmin = ['platform_admin', 'community_owner', 'admin'].includes(currentUserRole);

  if (!isOwnerOrAdmin) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-amber-800/80 bg-amber-950/30 p-8 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-900/40 border border-amber-600/40 text-amber-400">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-white">Owner Workspace Restricted</h2>
          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            Your role in <span className="text-amber-300 font-semibold">{community.name}</span> is <span className="font-mono uppercase font-bold text-white">{currentUserRole}</span>. Owner operations, triage queue, dispute adjudication, and bot configuration require Community Owner or Administrator privileges.
          </p>
          <div className="pt-4 flex items-center justify-center gap-3">
            {onSwitchToMemberSpace && (
              <button
                onClick={onSwitchToMemberSpace}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                Go to Member Space
              </button>
            )}
            <button
              onClick={() => onSelectTab('hub')}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Browse Community Hub
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoleError(null);
    setRoleSuccess(null);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_member_role',
          payload: {
            communityId: community.id,
            userId: selectedUserForRole,
            role: selectedRole
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setRoleError(data.error || 'Failed to update member role');
        return;
      }
      setRoleSuccess(`Successfully assigned role ${selectedRole}`);
      onRefresh();
    } catch (err) {
      setRoleError('Network error while updating role');
    }
  };

  const handleReviewContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingContribId || !reviewReason.trim()) return;

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review_contribution',
          payload: {
            contributionId: reviewingContribId,
            reviewerId: currentUser.id,
            decision: reviewDecision,
            reason: reviewReason
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setReviewingContribId(null);
        setReviewReason('');
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept_offer',
          payload: { offerId }
        })
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to accept offer:', err);
    }
  };

  const handleToggleDataMode = async (targetMode: DataMode) => {
    setIsResettingData(true);
    try {
      if (targetMode === 'production') {
        await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'reset_to_clean_production',
            payload: { communityId: community.id }
          })
        });
      } else {
        await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'restore_demo_seed' })
        });
      }
      onRefresh();
    } catch (err) {
      console.error('Failed to switch data mode:', err);
    } finally {
      setIsResettingData(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Workspace Header & Zero-Fabrication Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              Community Owner Workspace
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400 font-mono">
              Managing: {community.name}
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-1">
            Community Operations & Governance Center
          </h2>
        </div>

        {/* Zero-Fabrication Mode Switcher */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs font-mono shrink-0">
          <button
            onClick={() => handleToggleDataMode('demo')}
            disabled={isResettingData || dataMode === 'demo'}
            className={`px-3 py-1 rounded transition-colors ${
              dataMode === 'demo' ? 'bg-amber-950/60 text-amber-300 font-bold border border-amber-800/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            Demo Sandbox
          </button>
          <button
            onClick={() => handleToggleDataMode('production')}
            disabled={isResettingData || dataMode === 'production'}
            className={`px-3 py-1 rounded transition-colors ${
              dataMode === 'production' ? 'bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-800/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            Clean Production (Zero State)
          </button>
        </div>
      </div>

      {/* Owner Workspace Sub-Navigation */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-800/80 pb-2 text-xs font-medium text-slate-400 no-scrollbar">
        <button
          onClick={() => setActiveSection('operations')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
            activeSection === 'operations' ? 'bg-indigo-600/20 text-indigo-400 font-bold' : 'hover:text-slate-200'
          }`}
        >
          Priority Queue ({ownerActionItems.length})
        </button>
        <button
          onClick={() => setActiveSection('connect')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeSection === 'connect'
              ? 'bg-indigo-600/30 text-indigo-300 font-bold border border-indigo-500/50 shadow-sm'
              : 'hover:text-slate-200 text-indigo-400 hover:bg-slate-800/40'
          }`}
        >
          <Bot className="h-3.5 w-3.5" />
          <span>Connect Your Community</span>
          {community.discordConfig?.connected || community.telegramConfig?.connected ? (
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>
        <button
          onClick={() => setActiveSection('pricing')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeSection === 'pricing'
              ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shadow-sm'
              : 'hover:text-slate-200 text-amber-400/90 hover:bg-slate-800/40'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Plans & Growth ($15/mo)</span>
          {subscription?.tier === 'pro' && (
            <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-1 rounded">PRO</span>
          )}
        </button>
        <button
          onClick={() => setActiveSection('requests')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
            activeSection === 'requests' ? 'bg-indigo-600/20 text-indigo-400 font-bold' : 'hover:text-slate-200'
          }`}
        >
          Request Pipeline ({requests.length})
        </button>
        <button
          onClick={() => setActiveSection('reviews')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
            activeSection === 'reviews' ? 'bg-indigo-600/20 text-indigo-400 font-bold' : 'hover:text-slate-200'
          }`}
        >
          Review Queue ({pendingContributions.length})
        </button>
        <button
          onClick={() => setActiveSection('disputes')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
            activeSection === 'disputes' ? 'bg-indigo-600/20 text-indigo-400 font-bold' : 'hover:text-slate-200'
          }`}
        >
          Community Shield ({openDisputes.length})
        </button>
        <button
          onClick={() => setActiveSection('roles')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
            activeSection === 'roles' ? 'bg-indigo-600/20 text-indigo-400 font-bold' : 'hover:text-slate-200'
          }`}
        >
          Roles & Permissions
        </button>
        <button
          onClick={() => setActiveSection('config')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
            activeSection === 'config' ? 'bg-indigo-600/20 text-indigo-400 font-bold' : 'hover:text-slate-200'
          }`}
        >
          Community Taxonomy
        </button>
        <button
          onClick={() => setActiveSection('integrations')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
            activeSection === 'integrations' ? 'bg-indigo-600/20 text-indigo-400 font-bold' : 'hover:text-slate-200'
          }`}
        >
          Bot Gateways Health
        </button>
      </div>

      {/* SECTION: CONNECT YOUR COMMUNITY */}
      {activeSection === 'connect' && (
        <CommunityConnectionCenter
          community={community}
          currentUser={currentUser}
          currentUserRole={currentUserRole}
          lang={lang}
          onRefresh={onRefresh}
        />
      )}

      {/* SECTION: PLANS & MONETIZATION */}
      {activeSection === 'pricing' && (
        <PricingPlansSection
          community={community}
          subscription={subscription}
          entitlements={entitlements}
          isOwner={isOwnerOrAdmin}
          lang={lang}
          onRefresh={onRefresh}
        />
      )}

      {/* SECTION 1: OPERATIONS CENTER PRIORITY QUEUE (Part 3.1) */}
      {activeSection === 'operations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              The Operations Center highlights urgent community actions requiring owner decision or signoff.
            </p>
            <span className="text-xs font-mono text-slate-500">
              {ownerActionItems.length} action(s) awaiting attention
            </span>
          </div>

          {ownerActionItems.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-12 text-center space-y-2">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Operations Queue Clear</h3>
              <p className="text-xs text-slate-400">
                All requests, offers, contributions, and disputes are currently resolved.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {ownerActionItems.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    item.priority === 'urgent'
                      ? 'border-rose-900/50 bg-rose-950/15'
                      : item.priority === 'high'
                      ? 'border-amber-900/50 bg-amber-950/15'
                      : 'border-slate-800 bg-slate-900/40'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                          item.priority === 'urgent'
                            ? 'bg-rose-900/60 text-rose-300'
                            : item.priority === 'high'
                            ? 'bg-amber-900/60 text-amber-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {item.priority}
                      </span>
                      <h4 className="text-xs font-bold text-white">
                        {item.title}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-300">
                      {item.description}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {item.category === 'review' && (
                      <button
                        onClick={() => {
                          setReviewingContribId(item.targetId);
                          setActiveSection('reviews');
                        }}
                        className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Perform Audit</span>
                      </button>
                    )}
                    {item.category === 'offer' && (
                      <button
                        onClick={() => onSelectTab('requests')}
                        className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Review Offers</span>
                      </button>
                    )}
                    {item.category === 'dispute' && (
                      <button
                        onClick={() => setActiveSection('disputes')}
                        className="flex items-center gap-1.5 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        <span>Investigate</span>
                      </button>
                    )}
                    {item.category === 'task' && (
                      <button
                        onClick={() => onSelectTab('tasks')}
                        className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white hover:bg-slate-700"
                      >
                        <span>View Task</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: REQUEST PIPELINE */}
      {activeSection === 'requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">NeedSignal Community Pipeline</h3>
            <button
              onClick={() => onSelectTab('requests')}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <span>Open NeedSignal Studio</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-3">
            {requests.map((r) => {
              const reqOffers = offers.filter((o) => o.requestId === r.id);
              return (
                <div key={r.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{r.title}</span>
                    <span className="text-[11px] font-mono capitalize px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {r.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">{r.description}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
                    <span>Priority: {r.priority} · Skills: {r.skillsRequired.join(', ')}</span>
                    <span className="text-indigo-400 font-mono">{reqOffers.length} offer(s) received</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: CONTRIBUTION REVIEWS */}
      {activeSection === 'reviews' && (
        <div className="space-y-4">
          {/* Review Audit Modal */}
          {reviewingContribId && (
            <form onSubmit={handleReviewContribution} className="rounded-xl border border-indigo-600/60 bg-indigo-950/20 p-5 space-y-4">
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
                  onClick={() => setReviewingContribId(null)}
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
            {contributions.map((cnt) => (
              <div key={cnt.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{cnt.title}</span>
                  <span
                    className={`text-[11px] font-mono capitalize px-2 py-0.5 rounded ${
                      cnt.reviewStatus === 'verified'
                        ? 'bg-emerald-950 text-emerald-300'
                        : cnt.reviewStatus === 'disputed'
                        ? 'bg-rose-950 text-rose-300'
                        : 'bg-amber-950 text-amber-300'
                    }`}
                  >
                    {cnt.reviewStatus}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{cnt.description}</p>
                {cnt.evidence.length > 0 && (
                  <div className="flex gap-2 text-xs">
                    <span className="text-slate-500">Evidence:</span>
                    <a
                      href={cnt.evidence[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 underline"
                    >
                      {cnt.evidence[0].url}
                    </a>
                  </div>
                )}
                {cnt.reviewStatus === 'pending' && (
                  <div className="flex justify-end pt-2 border-t border-slate-800">
                    <button
                      onClick={() => setReviewingContribId(cnt.id)}
                      className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                    >
                      Audit & Verify
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: COMMUNITY SHIELD DISPUTES */}
      {activeSection === 'disputes' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Community Shield preserves member trust by maintaining immutable dispute audit trails and unbiased appeal routing.
          </p>

          {disputes.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-8 text-center text-xs text-slate-400">
              Zero active disputes. All community outcomes are uncontested.
            </div>
          ) : (
            disputes.map((d) => (
              <div key={d.id} className="rounded-xl border border-rose-900/40 bg-rose-950/15 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Dispute on Deliverable {d.contributionId}</span>
                  <span className="text-[11px] font-mono text-rose-300 bg-rose-950 px-2 py-0.5 rounded capitalize">
                    {d.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{d.reason}</p>
                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
                  Filed by {d.filedById} on {new Date(d.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SECTION 5: ROLES & GRANULAR PERMISSIONS (Part 3.1) */}
      {activeSection === 'roles' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Assign Granular Community Role
            </h3>
            <p className="text-xs text-slate-400">
              Community owners can configure administrators, moderators, reviewers, task managers, and experts directly without code edits.
            </p>

            {roleError && (
              <div className="rounded-lg bg-rose-950/40 border border-rose-800/50 p-3 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{roleError}</span>
              </div>
            )}

            {roleSuccess && (
              <div className="rounded-lg bg-emerald-950/40 border border-emerald-800/50 p-3 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{roleSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdateRole} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Select Member</label>
                <select
                  value={selectedUserForRole}
                  onChange={(e) => setSelectedUserForRole(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Target Community Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  className="w-full rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white capitalize"
                >
                  <option value="admin">Administrator</option>
                  <option value="moderator">Moderator</option>
                  <option value="reviewer">Reviewer / Verifier</option>
                  <option value="task_manager">Task Manager</option>
                  <option value="expert">Community Expert</option>
                  <option value="member">Regular Member</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
                >
                  Update Member Role
                </button>
              </div>
            </form>
          </div>

          {/* Current Members List */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Active Community Members & Authority
            </h3>
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900/60 text-xs">
                  <div>
                    <span className="font-semibold text-white block">{u.name}</span>
                    <span className="text-[11px] text-slate-400">{u.email}</span>
                  </div>
                  <span className="font-mono text-indigo-400 capitalize bg-indigo-950/40 px-2 py-0.5 rounded">
                    {u.id === community.ownerId ? 'Community Owner' : 'Reviewer / Member'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 6: COMMUNITY TAXONOMY & RULES */}
      {activeSection === 'config' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Contribution Taxonomy Rules (MOD-1)
            </h3>
            <div className="space-y-2">
              {community.contributionCategories.map((cat) => (
                <div key={cat.id} className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{cat.name}</span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {cat.requiresReview ? 'Peer Review Required' : 'Auto Signoff'}
                    </span>
                  </div>
                  <p className="text-slate-400">{cat.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 7: BOT GATEWAYS HEALTH */}
      {activeSection === 'integrations' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
              <span className="text-xs font-bold text-white block">Discord Server Status</span>
              <div className="text-xs space-y-1 text-slate-300">
                <div>Server: <span className="font-mono text-white">{community.discordConfig.serverName || 'Unlinked'}</span></div>
                <div>Status: <span className="font-mono text-emerald-400">{community.discordConfig.status}</span></div>
              </div>
              <button
                onClick={() => onSelectTab('integrations')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                Open Discord Diagnostic Center →
              </button>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
              <span className="text-xs font-bold text-white block">Telegram Group Status</span>
              <div className="text-xs space-y-1 text-slate-300">
                <div>Group: <span className="font-mono text-white">{community.telegramConfig.groupTitle || 'Unlinked'}</span></div>
                <div>Status: <span className="font-mono text-sky-400">{community.telegramConfig.status}</span></div>
              </div>
              <button
                onClick={() => onSelectTab('integrations')}
                className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
              >
                Open Telegram Diagnostic Center →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
