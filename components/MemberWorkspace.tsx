'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { translations } from '@/lib/i18n';
import {
  User,
  Community,
  NeedSignalRequest,
  Offer,
  PlanTask,
  Commitment,
  Contribution,
  OutcomePortfolioItem,
  NotificationItem,
  IdentityChallenge,
  Language
} from '@/lib/types';
import {
  Inbox,
  Sparkles,
  ListTodo,
  CheckCircle2,
  Clock,
  Shield,
  Key,
  Copy,
  Check,
  Send,
  ExternalLink,
  Plus,
  Circle,
  Eye,
  EyeOff,
  UserCheck,
  Bot
} from 'lucide-react';

interface MemberWorkspaceProps {
  currentUser: User;
  users: User[];
  communities: Community[];
  requests: NeedSignalRequest[];
  offers: Offer[];
  tasks: PlanTask[];
  commitments: Commitment[];
  contributions: Contribution[];
  portfolioItems: OutcomePortfolioItem[];
  notifications: NotificationItem[];
  identityChallenges: IdentityChallenge[];
  lang: Language;
  onRefresh: () => void;
  onSelectUser: (user: User) => void;
  onSelectTab: (tab: string) => void;
}

export const MemberWorkspace: React.FC<MemberWorkspaceProps> = ({
  currentUser,
  users,
  communities,
  requests,
  offers,
  tasks,
  commitments,
  contributions,
  portfolioItems,
  notifications,
  identityChallenges,
  lang,
  onRefresh,
  onSelectUser,
  onSelectTab
}) => {
  const t = translations[lang];

  const [activeSubTab, setActiveSubTab] = useState<'inbox' | 'feed' | 'tasks' | 'commitments' | 'passport' | 'identity'>('inbox');

  // One-time challenge state
  const [isGeneratingChallenge, setIsGeneratingChallenge] = useState<boolean>(false);
  const [challengePlatform, setChallengePlatform] = useState<'discord' | 'telegram'>('discord');
  const [createdChallengeCode, setCreatedChallengeCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Evidence submission state
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState<string>('');
  const [evidenceNotes, setEvidenceNotes] = useState<string>('');

  // Personal Opportunity Feed matching
  const userSkillNames = currentUser.passport.skills.map((s) => s.name.toLowerCase());
  const opportunityFeed = requests.filter((r) => {
    if (r.creatorId === currentUser.id) return false;
    if (r.status !== 'open' && r.status !== 'receiving_offers') return false;
    // Check if any skill matches or general match
    const hasSkillMatch = r.skillsRequired.some((sk) =>
      userSkillNames.some((uSk) => sk.toLowerCase().includes(uSk) || uSk.includes(sk.toLowerCase()))
    );
    return hasSkillMatch || r.priority === 'urgent';
  });

  const myRequests = requests.filter((r) => r.creatorId === currentUser.id);
  const myOffers = offers.filter((o) => o.memberId === currentUser.id);
  const myTasks = tasks.filter((t) => t.assigneeId === currentUser.id);
  const myCommitments = commitments.filter((c) => c.committedById === currentUser.id);
  const myContributions = contributions.filter((c) => c.memberId === currentUser.id);
  const myNotifications = notifications.filter((n) => n.userId === currentUser.id);

  const handleGenerateChallenge = async () => {
    setIsGeneratingChallenge(true);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_identity_challenge',
          payload: {
            userId: currentUser.id,
            platform: challengePlatform
          }
        })
      });
      const data = await res.json();
      if (data.success && data.result) {
        setCreatedChallengeCode(data.result.code);
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to create identity challenge:', err);
    } finally {
      setIsGeneratingChallenge(false);
    }
  };

  const handleCopyChallengeCode = () => {
    if (!createdChallengeCode) return;
    navigator.clipboard.writeText(createdChallengeCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleToggleChecklist = async (taskId: string, checklistId: string, completed: boolean) => {
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_checklist',
          payload: { taskId, checklistId, completed }
        })
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to update task checklist:', err);
    }
  };

  const handleSubmitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingTaskId || !evidenceUrl.trim()) return;

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete_task',
          payload: {
            taskId: completingTaskId,
            evidenceUrl,
            description: evidenceNotes,
            memberId: currentUser.id
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setCompletingTaskId(null);
        setEvidenceUrl('');
        setEvidenceNotes('');
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to submit deliverable:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Persona Bar & Active Member Identity */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
              Member Workspace & Personal Space
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400 font-mono">
              Active Member: {currentUser.name}
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-1">
            Personal Action Hub & Portable Records
          </h2>
        </div>

        {/* Real Member Profile Badge */}
        <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 px-3.5 py-2 rounded-xl text-xs shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white text-xs shadow">
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <div className="font-semibold text-white flex items-center gap-1.5">
                <span>{currentUser.name}</span>
                <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-mono text-indigo-400 border border-indigo-500/20">
                  {currentUser.platformRole}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {currentUser.email}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Member Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-800/80 pb-2 text-xs font-medium text-slate-400 no-scrollbar">
        <button
          onClick={() => setActiveSubTab('inbox')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
            activeSubTab === 'inbox' ? 'bg-indigo-600/20 text-indigo-400 font-bold' : 'hover:text-slate-200'
          }`}
        >
          Community Inbox ({myNotifications.length})
        </button>
        <button
          onClick={() => setActiveSubTab('feed')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
            activeSubTab === 'feed' ? 'bg-indigo-600/20 text-indigo-400 font-bold' : 'hover:text-slate-200'
          }`}
        >
          Opportunity Feed ({opportunityFeed.length})
        </button>
        <button
          onClick={() => setActiveSubTab('tasks')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
            activeSubTab === 'tasks' ? 'bg-indigo-600/20 text-indigo-400 font-bold' : 'hover:text-slate-200'
          }`}
        >
          My Tasks & Milestones ({myTasks.length})
        </button>
        <button
          onClick={() => setActiveSubTab('commitments')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
            activeSubTab === 'commitments' ? 'bg-indigo-600/20 text-indigo-400 font-bold' : 'hover:text-slate-200'
          }`}
        >
          My Commitments ({myCommitments.length})
        </button>
        <button
          onClick={() => setActiveSubTab('passport')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
            activeSubTab === 'passport' ? 'bg-indigo-600/20 text-indigo-400 font-bold' : 'hover:text-slate-200'
          }`}
        >
          Member Passport & Privacy
        </button>
        <button
          onClick={() => setActiveSubTab('identity')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
            activeSubTab === 'identity' ? 'bg-indigo-600/20 text-indigo-400 font-bold' : 'hover:text-slate-200'
          }`}
        >
          Platform Linking Challenges
        </button>
      </div>

      {/* SUBTAB 1: COMMUNITY INBOX (User-1) */}
      {activeSubTab === 'inbox' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Unified actionable inbox capturing request updates, offer decisions, task review decisions, and event notifications.
          </p>

          {myNotifications.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-8 text-center text-xs text-slate-400">
              Inbox is clean. No pending alerts.
            </div>
          ) : (
            <div className="space-y-3">
              {myNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    notif.read ? 'border-slate-800 bg-slate-900/30' : 'border-indigo-600/50 bg-indigo-950/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{notif.title}</span>
                        {!notif.read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        )}
                      </div>
                      <p className="text-xs text-slate-300">{notif.message}</p>
                    </div>

                    <button
                      onClick={() => onSelectTab(notif.linkUrl.replace('/', ''))}
                      className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-white hover:bg-slate-700 shrink-0"
                    >
                      <span>Open Record</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-800/60 text-[11px] text-slate-500 font-mono flex items-center justify-between">
                    <span>Community: {notif.communityId}</span>
                    <span>{new Date(notif.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: OPPORTUNITY FEED (User-3) */}
      {activeSubTab === 'feed' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Personal Opportunity Feed matching community needs against your declared and verified skills ({currentUser.passport.skills.map((s) => s.name).join(', ')}).
          </p>

          {opportunityFeed.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-8 text-center text-xs text-slate-400">
              No matching open opportunities currently.
            </div>
          ) : (
            <div className="space-y-3">
              {opportunityFeed.map((req) => (
                <div key={req.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-white">{req.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                        <span>Community: {req.communityId}</span>
                        <span>·</span>
                        <span>Deadline: {new Date(req.deadline).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded capitalize">
                      {req.priority}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">{req.description}</p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                    <div className="flex flex-wrap gap-1.5">
                      {req.skillsRequired.map((sk, idx) => (
                        <span key={idx} className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded">
                          {sk}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => onSelectTab('requests')}
                      className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Submit Assistance Offer</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: MY TASKS & MILESTONES */}
      {activeSubTab === 'tasks' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Active deliverables assigned to you in QuestLoop. Toggle checklists and attach verifiable evidence URLs.
          </p>

          {/* Evidence Submit Drawer */}
          {completingTaskId && (
            <form onSubmit={handleSubmitDeliverable} className="rounded-xl border border-indigo-600/60 bg-indigo-950/20 p-5 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-400" />
                <span>Submit Deliverable for Official Verification</span>
              </h4>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Verifiable Evidence URL (PR, Document, or Audit Report)</label>
                <input
                  type="url"
                  required
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://github.com/... or https://docs..."
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Completion Notes</label>
                <textarea
                  rows={2}
                  value={evidenceNotes}
                  onChange={(e) => setEvidenceNotes(e.target.value)}
                  placeholder="Explain how deliverable fulfills acceptance criteria..."
                  className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCompletingTaskId(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  Submit to Contribution Ledger
                </button>
              </div>
            </form>
          )}

          {myTasks.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-8 text-center text-xs text-slate-400">
              No tasks currently assigned to your account.
            </div>
          ) : (
            <div className="space-y-3">
              {myTasks.map((t) => (
                <div key={t.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{t.title}</span>
                    <span
                      className={`text-[11px] font-mono capitalize px-2 py-0.5 rounded ${
                        t.status === 'completed'
                          ? 'bg-emerald-950 text-emerald-300'
                          : 'bg-indigo-950 text-indigo-300'
                      }`}
                    >
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">{t.description}</p>

                  {/* Checklist */}
                  <div className="space-y-1.5">
                    {t.checklist.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handleToggleChecklist(t.id, c.id, !c.completed)}
                        className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer p-1 rounded hover:bg-slate-800/40"
                      >
                        {c.completed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-slate-500" />
                        )}
                        <span className={c.completed ? 'line-through text-slate-500' : ''}>{c.item}</span>
                      </div>
                    ))}
                  </div>

                  {t.status !== 'completed' && (
                    <div className="flex justify-end pt-2 border-t border-slate-800">
                      <button
                        onClick={() => setCompletingTaskId(t.id)}
                        className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                      >
                        <Shield className="h-3.5 w-3.5" />
                        <span>Submit Work with Evidence</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: MY COMMITMENTS (PromiseGraph) */}
      {activeSubTab === 'commitments' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            PromiseGraph isolates explicit member promises with delivery dates and audit histories from casual conversation.
          </p>

          {myCommitments.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-8 text-center text-xs text-slate-400">
              No active commitments logged for your account.
            </div>
          ) : (
            <div className="space-y-3">
              {myCommitments.map((com) => (
                <div key={com.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">Promised to Deliver:</span>
                    <span className="font-mono text-emerald-400 capitalize">{com.status}</span>
                  </div>
                  <p className="text-xs text-slate-300">{com.agreedWhat}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
                    <span>Deadline: {new Date(com.deadline).toLocaleDateString()}</span>
                    <span>Expecting: {com.expectingDeliveryId}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 5: MEMBER PASSPORT */}
      {activeSubTab === 'passport' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Your Member Passport represents your cross-community identity, separating self-declared capabilities from peer-verified achievements.
          </p>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-indigo-500/40 bg-slate-800 shrink-0">
                  <Image
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{currentUser.passport.displayName}</h3>
                  <span className="text-xs text-slate-400 font-mono">{currentUser.email}</span>
                  <p className="text-xs text-slate-300 mt-1">{currentUser.passport.biography}</p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <a
                  href={`/p/${currentUser.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-600/10 hover:bg-indigo-600/20 px-3 py-1.5 text-xs font-semibold text-indigo-400 transition-all font-mono"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Public Passport</span>
                </a>
              </div>
            </div>

            {/* Skills Taxonomy */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Skills Taxonomy
              </span>
              <div className="flex flex-wrap gap-2">
                {currentUser.passport.skills.map((s, idx) => (
                  <span
                    key={idx}
                    className={`text-xs px-2.5 py-1 rounded-md border font-medium flex items-center gap-1.5 ${
                      s.verified
                        ? 'border-emerald-600/40 bg-emerald-950/20 text-emerald-300'
                        : 'border-slate-700 bg-slate-800 text-slate-300'
                    }`}
                  >
                    {s.verified && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                    <span>{s.name}</span>
                    {s.verified && <span className="text-[10px] text-emerald-400 font-mono">(Verified)</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 6: CONNECTED ACCOUNTS & IDENTITY LINKING */}
      {activeSubTab === 'identity' && (
        <div className="space-y-6">
          {/* Connected Personal Accounts Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Discord Account Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-[#5865F2]/20 border border-[#5865F2]/40 flex items-center justify-center text-[#8ea1ff]">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Personal Discord Account</h4>
                    <span className="text-[10px] text-slate-400 font-mono">Member Identity & Roles</span>
                  </div>
                </div>
                {currentUser.identities?.discordId ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Connected</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                    <span>Not Linked</span>
                  </span>
                )}
              </div>

              {currentUser.identities?.discordId ? (
                <div className="rounded-lg bg-slate-950 p-3 space-y-1 text-xs font-mono">
                  <div className="text-slate-300">@{currentUser.identities.discordUsername || 'discord_user'}</div>
                  <div className="text-[10px] text-slate-500">ID: {currentUser.identities.discordId}</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 leading-normal">
                    Link your Discord identity to receive role attestations, notifications, and slash command access.
                  </p>
                  <a
                    href="/api/discord/connect?mode=user&redirect=true"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#5865F2]/40 bg-[#5865F2]/10 hover:bg-[#5865F2]/20 px-3.5 py-1.5 text-xs font-semibold text-[#8ea1ff] transition-all"
                  >
                    <Bot className="h-3.5 w-3.5" />
                    <span>Connect Discord via OAuth</span>
                  </a>
                </div>
              )}
            </div>

            {/* Telegram Account Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-[#229ED9]/20 border border-[#229ED9]/40 flex items-center justify-center text-[#54bbf0]">
                    <Send className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Personal Telegram Account</h4>
                    <span className="text-[10px] text-slate-400 font-mono">Member Passport & Alerts</span>
                  </div>
                </div>
                {currentUser.identities?.telegramId ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Connected</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                    <span>Not Linked</span>
                  </span>
                )}
              </div>

              {currentUser.identities?.telegramId ? (
                <div className="rounded-lg bg-slate-950 p-3 space-y-1 text-xs font-mono">
                  <div className="text-slate-300">@{currentUser.identities.telegramUsername || 'telegram_user'}</div>
                  <div className="text-[10px] text-slate-500">ID: {currentUser.identities.telegramId}</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 leading-normal">
                    Link your Telegram identity to verify deliverables and query tasks directly via @CommunityOutcomeBot.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href="/api/auth/telegram/authorize?redirect=true"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#229ED9]/40 bg-[#229ED9]/10 hover:bg-[#229ED9]/20 px-3 py-1.5 text-xs font-semibold text-[#54bbf0] transition-all"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Connect via Telegram OIDC</span>
                    </a>
                    <a
                      href="https://t.me/CommunityOutcomeBot?start=connect"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs text-slate-300 transition-all"
                    >
                      <span>Open @Bot</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* In-Chat One-Time Verification Challenge Generator */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">
                Link via In-Chat Verification Code (/connect &lt;code&gt;)
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              If you prefer not to use OAuth, generate a cryptographically bound single-use 6-character challenge code and send it directly to the bot.
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <select
                value={challengePlatform}
                onChange={(e) => setChallengePlatform(e.target.value as any)}
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white capitalize"
              >
                <option value="discord">Discord (/connect &lt;code&gt;)</option>
                <option value="telegram">Telegram (/connect &lt;code&gt;)</option>
              </select>

              <button
                onClick={handleGenerateChallenge}
                disabled={isGeneratingChallenge}
                className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
              >
                <Key className="h-3.5 w-3.5" />
                <span>Generate 15-Minute Challenge</span>
              </button>
            </div>

            {createdChallengeCode && (
              <div className="rounded-lg border border-indigo-700/60 bg-indigo-950/30 p-4 space-y-2">
                <span className="text-xs text-indigo-200 font-medium block">
                  Your One-Time Verification Challenge Code:
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold font-mono tracking-widest text-white bg-slate-900 px-4 py-2 rounded-md border border-slate-700">
                    {createdChallengeCode}
                  </span>
                  <button
                    onClick={handleCopyChallengeCode}
                    className="flex items-center gap-1 rounded-md bg-slate-800 px-3 py-2 text-xs text-slate-200 hover:text-white border border-slate-700"
                  >
                    {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Run <code className="text-indigo-300">/connect {createdChallengeCode}</code> inside {challengePlatform === 'discord' ? 'Discord bot channel' : 'Telegram bot chat'} to complete authentication.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
