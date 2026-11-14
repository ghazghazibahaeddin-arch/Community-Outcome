'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { translations } from '@/lib/i18n';
import {
  User,
  Community,
  CommunityMembership,
  CommunityAnnouncement,
  CommunityEvent,
  Poll,
  TaskHandoff,
  OutcomeRecord,
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
  CheckCircle2,
  Shield,
  Key,
  Copy,
  Check,
  Send,
  ExternalLink,
  Plus,
  Circle,
  UserCheck,
  Bot,
  LogIn,
  Settings,
  Megaphone,
  Pin,
  Ticket,
  Calendar,
  MapPin,
  Vote,
  Award,
  ThumbsUp,
  ArrowRightLeft,
  Pencil,
  Globe,
  Sparkles,
  Trash2,
  Bell
} from 'lucide-react';

interface MemberWorkspaceProps {
  currentUser: User;
  users: User[];
  communities: Community[];
  memberships?: CommunityMembership[];
  announcements?: CommunityAnnouncement[];
  events?: CommunityEvent[];
  polls?: Poll[];
  handoffs?: TaskHandoff[];
  outcomes?: OutcomeRecord[];
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
  initialSubTab?: 'inbox' | 'feed' | 'communities' | 'events' | 'tasks' | 'commitments' | 'passport' | 'identity';
  onOpenAccountSettings?: () => void;
}

export const MemberWorkspace: React.FC<MemberWorkspaceProps> = ({
  currentUser,
  users,
  communities,
  memberships = [],
  announcements = [],
  events = [],
  polls = [],
  handoffs = [],
  outcomes = [],
  requests,
  offers,
  tasks,
  commitments,
  contributions,
  notifications,
  lang,
  onRefresh,
  onSelectTab,
  initialSubTab,
  onOpenAccountSettings
}) => {
  const _t = translations[lang];

  const [activeSubTab, setActiveSubTab] = useState<
    'inbox' | 'feed' | 'communities' | 'events' | 'tasks' | 'commitments' | 'passport' | 'identity'
  >(initialSubTab || 'inbox');

  useEffect(() => {
    if (!initialSubTab) return;
    const timer = setTimeout(() => setActiveSubTab(initialSubTab), 0);
    return () => clearTimeout(timer);
  }, [initialSubTab]);

  // General UI Feedback
  const [actionFeedback, setActionFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Inbox filter
  const [inboxFilter, setInboxFilter] = useState<'all' | 'unread'>('all');

  // Inline Offer Submission state
  const [offeringRequestId, setOfferingRequestId] = useState<string | null>(null);
  const [offerProposal, setOfferProposal] = useState<string>('');
  const [offerHours, setOfferHours] = useState<number>(4);
  const [offerAvailability, setOfferAvailability] = useState<string>('Available this week');

  // Invite Code Redemption state
  const [inviteCodeInput, setInviteCodeInput] = useState<string>('');

  // Task Handoff Request state
  const [handoffTaskId, setHandoffTaskId] = useState<string | null>(null);
  const [handoffTargetUserId, setHandoffTargetUserId] = useState<string>('');
  const [handoffNotes, setHandoffNotes] = useState<string>('');

  // Passport & Privacy Editor state
  const [isEditingPassport, setIsEditingPassport] = useState<boolean>(false);
  const [editBio, setEditBio] = useState<string>(currentUser.passport.biography || '');
  const [editSkills, setEditSkills] = useState(currentUser.passport.skills || []);
  const [newSkillName, setNewSkillName] = useState<string>('');
  const [editPortfolioLinks, setEditPortfolioLinks] = useState<string[]>(currentUser.passport.portfolioLinks || []);
  const [newPortfolioUrl, setNewPortfolioUrl] = useState<string>('');
  const [editIsPublic, setEditIsPublic] = useState<boolean>(currentUser.passport.isPublic);
  const [editPrivacy, setEditPrivacy] = useState(currentUser.privacy);

  useEffect(() => {
    const timer = setTimeout(() => {
      setEditBio(currentUser.passport.biography || '');
      setEditSkills(currentUser.passport.skills || []);
      setEditPortfolioLinks(currentUser.passport.portfolioLinks || []);
      setEditIsPublic(currentUser.passport.isPublic);
      setEditPrivacy(currentUser.privacy);
    }, 0);
    return () => clearTimeout(timer);
  }, [currentUser]);

  // One-time challenge state
  const [isGeneratingChallenge, setIsGeneratingChallenge] = useState<boolean>(false);
  const [challengePlatform, setChallengePlatform] = useState<'discord' | 'telegram'>('discord');
  const [createdChallengeCode, setCreatedChallengeCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Evidence submission state
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState<string>('');
  const [evidenceNotes, setEvidenceNotes] = useState<string>('');

  // Derived collections
  const userSkillNames = currentUser.passport.skills.map((s) => s.name.toLowerCase());
  const opportunityFeed = requests.filter((r) => {
    if (r.creatorId === currentUser.id) return false;
    if (r.status !== 'open' && r.status !== 'receiving_offers') return false;
    const hasSkillMatch = r.skillsRequired.some((sk) =>
      userSkillNames.some((uSk) => sk.toLowerCase().includes(uSk) || uSk.includes(sk.toLowerCase()))
    );
    return hasSkillMatch || r.priority === 'urgent' || userSkillNames.length === 0;
  });

  const openBounties = tasks.filter((t) => !t.assigneeId && t.status === 'todo');
  const myOffers = offers.filter((o) => o.memberId === currentUser.id);
  const myTasks = tasks.filter((t) => t.assigneeId === currentUser.id);
  const myCommitments = commitments.filter((c) => c.committedById === currentUser.id);
  const incomingHandoffs = handoffs.filter((h) => h.nextOwnerId === currentUser.id && !h.accepted);
  const myNotifications = notifications.filter((n) => n.userId === currentUser.id);
  const unreadCount = myNotifications.filter((n) => !n.read).length;
  const visibleNotifications = inboxFilter === 'unread' ? myNotifications.filter((n) => !n.read) : myNotifications;

  const joinedCommunityIds = new Set(
    memberships.filter((m) => m.userId === currentUser.id).map((m) => m.communityId)
  );

  // Real Leaderboard Calculation (strictly derived from verified work & tasks, zero fabricated scores)
  const leaderboard = users
    .map((u) => {
      const verifiedContribs = contributions.filter((c) => c.memberId === u.id && c.reviewStatus === 'verified').length;
      const completedTasks = tasks.filter((t) => t.assigneeId === u.id && t.status === 'completed').length;
      const verifiedOutcomes = outcomes.filter((o) => o.participatingMemberIds.includes(u.id)).length;
      const totalEndorsements = u.passport.skills.reduce((sum, s) => sum + (s.endorsementsCount || 0), 0);
      return {
        user: u,
        verifiedContribs,
        completedTasks,
        verifiedOutcomes,
        totalEndorsements,
        score: verifiedContribs * 3 + completedTasks * 2 + verifiedOutcomes * 2 + totalEndorsements
      };
    })
    .sort((a, b) => b.score - a.score);

  const callApiAction = async (action: string, payload: Record<string, any>) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action, payload })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || `Action "${action}" failed`);
    }
    return data;
  };

  // Handlers
  const handleMarkNotificationRead = async (notificationId: string) => {
    try {
      await callApiAction('mark_notification_read', { notificationId });
      onRefresh();
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await callApiAction('mark_all_notifications_read', { userId: currentUser.id });
      setActionFeedback({ type: 'success', text: 'All notifications marked as read.' });
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Failed to mark notifications read.' });
    }
  };

  const handleSubmitQuickOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offeringRequestId || !offerProposal.trim()) return;
    const req = requests.find((r) => r.id === offeringRequestId);
    setIsSubmitting(true);
    setActionFeedback(null);
    try {
      await callApiAction('submit_offer', {
        requestId: offeringRequestId,
        communityId: req?.communityId || communities[0]?.id || 'comm_devforge',
        memberId: currentUser.id,
        proposedHelp: offerProposal.trim(),
        skills: currentUser.passport.skills.map((s) => s.name),
        experienceDescription: currentUser.passport.biography,
        availability: offerAvailability,
        estimatedHours: Number(offerHours) || 4,
        portfolioLinks: currentUser.passport.portfolioLinks
      });
      setActionFeedback({ type: 'success', text: 'Assistance offer submitted! The community owner can now review and assign it.' });
      setOfferingRequestId(null);
      setOfferProposal('');
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Failed to submit assistance offer.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaimBounty = async (taskId: string) => {
    setActionFeedback(null);
    setIsSubmitting(true);
    try {
      await callApiAction('claim_task', { taskId, userId: currentUser.id });
      setActionFeedback({ type: 'success', text: 'Bounty claimed! It is now active inside My Tasks & Milestones.' });
      setActiveSubTab('tasks');
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Failed to claim open bounty.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinCommunity = async (communityId: string) => {
    setActionFeedback(null);
    setIsSubmitting(true);
    try {
      await callApiAction('join_community', { communityId, userId: currentUser.id });
      setActionFeedback({ type: 'success', text: 'Joined community successfully!' });
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Failed to join community.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRedeemInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;
    setActionFeedback(null);
    setIsSubmitting(true);
    try {
      const data = await callApiAction('redeem_invite_code', { code: inviteCodeInput.trim(), userId: currentUser.id });
      setActionFeedback({
        type: 'success',
        text: `Invite redeemed! Joined ${data.result?.community?.name || 'community'} as ${data.result?.membership?.role || 'member'}.`
      });
      setInviteCodeInput('');
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Invalid or expired invite code.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCastVote = async (pollId: string, alternativeId: string) => {
    setActionFeedback(null);
    try {
      await callApiAction('cast_vote', { pollId, alternativeId, userId: currentUser.id });
      setActionFeedback({ type: 'success', text: 'Vote recorded cleanly.' });
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Failed to cast vote.' });
    }
  };

  const handleToggleRsvp = async (eventId: string) => {
    setActionFeedback(null);
    try {
      await callApiAction('rsvp_event', { eventId, userId: currentUser.id });
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Failed to update RSVP.' });
    }
  };

  const handleAcceptHandoff = async (handoffId: string) => {
    setActionFeedback(null);
    try {
      await callApiAction('accept_handoff', { handoffId });
      setActionFeedback({ type: 'success', text: 'Task handoff accepted and transferred to your queue.' });
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Failed to accept handoff.' });
    }
  };

  const handleCreateHandoff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoffTaskId || !handoffTargetUserId) return;
    const tsk = myTasks.find((t) => t.id === handoffTaskId);
    setIsSubmitting(true);
    setActionFeedback(null);
    try {
      await callApiAction('create_handoff', {
        communityId: tsk?.communityId || communities[0]?.id || 'comm_devforge',
        taskId: handoffTaskId,
        previousOwnerId: currentUser.id,
        nextOwnerId: handoffTargetUserId,
        contextNotes: handoffNotes || 'Handing over milestone context.',
        transferredEvidence: []
      });
      setActionFeedback({ type: 'success', text: 'Task handoff request sent to teammate.' });
      setHandoffTaskId(null);
      setHandoffNotes('');
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Failed to initiate handoff.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePassport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionFeedback(null);
    try {
      await callApiAction('update_passport', {
        userId: currentUser.id,
        passport: {
          biography: editBio,
          skills: editSkills,
          portfolioLinks: editPortfolioLinks,
          isPublic: editIsPublic
        }
      });
      await callApiAction('update_privacy', {
        userId: currentUser.id,
        privacy: editPrivacy
      });
      setActionFeedback({ type: 'success', text: 'Member Passport & Privacy settings updated.' });
      setIsEditingPassport(false);
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Failed to save passport.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndorsePeer = async (targetUserId: string, skillName: string) => {
    setActionFeedback(null);
    try {
      await callApiAction('endorse_member_skill', {
        targetUserId,
        skillName,
        endorserId: currentUser.id,
        communityId: communities[0]?.id || 'comm_devforge'
      });
      setActionFeedback({ type: 'success', text: `Endorsed "${skillName}"!` });
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Failed to send endorsement.' });
    }
  };

  const handleGenerateChallenge = async () => {
    setIsGeneratingChallenge(true);
    setActionFeedback(null);
    try {
      const data = await callApiAction('create_identity_challenge', {
        userId: currentUser.id,
        platform: challengePlatform
      });
      setCreatedChallengeCode(data.result.code);
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Network error generating challenge.' });
    } finally {
      setIsGeneratingChallenge(false);
    }
  };

  const handleCopyChallengeCode = async () => {
    if (!createdChallengeCode) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(createdChallengeCode);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2500);
      }
    } catch {}
  };

  const handleToggleChecklist = async (taskId: string, checklistId: string, completed: boolean) => {
    setActionFeedback(null);
    try {
      await callApiAction('update_checklist', { taskId, checklistId, completed });
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Connection error updating checklist.' });
    }
  };

  const handleSubmitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingTaskId || !evidenceUrl.trim()) return;
    setActionFeedback(null);
    try {
      await callApiAction('complete_task', {
        taskId: completingTaskId,
        evidenceUrl,
        description: evidenceNotes,
        memberId: currentUser.id
      });
      setCompletingTaskId(null);
      setEvidenceUrl('');
      setEvidenceNotes('');
      setActionFeedback({ type: 'success', text: 'Deliverable submitted to the Contribution Ledger for verification.' });
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Connection error submitting deliverable.' });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
      {/* Persona Bar & Active Member Identity */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
              {lang === 'ar' ? 'مساحة العضو الشخصية' : 'Member Workspace & Personal Space'}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400 font-mono">
              Active Member: {currentUser.name}
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-1">
            {lang === 'ar' ? 'مركز المهام، الفعاليات، والإنجازات الموثقة' : 'Personal Action Hub & Portable Records'}
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
              <div className="text-[11px] text-slate-400 font-mono">{currentUser.email}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Clear Member Sign-In & Direct Discord/Telegram Account Linking Strip */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="text-xs font-semibold text-white flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-indigo-400" />
            <span>
              {lang === 'ar'
                ? 'حساب العضو وربط Discord و Telegram مباشرة'
                : 'Member Account & Direct Discord / Telegram Linking'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {lang === 'ar'
              ? 'اربط حسابك في Discord أو Telegram مباشرة بملفك لاستلام المهام والإشعارات وتوثيق النتائج.'
              : 'Link your Discord and Telegram accounts directly to your profile for instant task sync, bot commands, and verified outcomes.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentUser.identities?.discordId ? (
            <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-300 font-medium">
                Discord: @{currentUser.identities.discordUsername || 'Connected'}
              </span>
              <a
                href="/api/discord/connect?mode=user&redirect=true"
                className="text-[10px] font-mono text-[#9aa8ff] hover:underline ml-1"
              >
                {lang === 'ar' ? 'تحديث' : 'Re-link'}
              </a>
            </div>
          ) : (
            <a
              href="/api/discord/connect?mode=user&redirect=true"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#5865F2]/50 bg-[#5865F2]/20 hover:bg-[#5865F2]/30 px-3 py-1.5 text-xs font-semibold text-[#9aa8ff] transition-all whitespace-nowrap"
            >
              <Bot className="h-3.5 w-3.5" />
              <span>{lang === 'ar' ? 'ربط Discord الآن' : 'Link Discord Now'}</span>
            </a>
          )}

          {currentUser.identities?.telegramId ? (
            <div className="inline-flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-sky-400" />
              <span className="text-sky-300 font-medium">
                Telegram: @{currentUser.identities.telegramUsername || 'Connected'}
              </span>
              <a
                href="/api/auth/telegram/authorize?redirect=true"
                className="text-[10px] font-mono text-[#5dc5f7] hover:underline ml-1"
              >
                {lang === 'ar' ? 'تحديث' : 'Re-link'}
              </a>
            </div>
          ) : (
            <a
              href="/api/auth/telegram/authorize?redirect=true"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#229ED9]/50 bg-[#229ED9]/20 hover:bg-[#229ED9]/30 px-3 py-1.5 text-xs font-semibold text-[#5dc5f7] transition-all whitespace-nowrap"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{lang === 'ar' ? 'ربط Telegram الآن' : 'Link Telegram Now'}</span>
            </a>
          )}

          {onOpenAccountSettings && (
            <button
              type="button"
              onClick={onOpenAccountSettings}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap"
            >
              <Settings className="h-3.5 w-3.5 text-slate-400" />
              <span>{lang === 'ar' ? 'إعدادات الحساب' : 'Account'}</span>
            </button>
          )}

          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition-colors whitespace-nowrap"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>{lang === 'ar' ? 'تسجيل / تبديل الحساب' : 'Sign In / Switch'}</span>
          </Link>
        </div>
      </div>

      {/* Member Navigation Tabs */}
      <div className="flex overflow-x-auto gap-1.5 border-b border-slate-800/80 pb-2.5 text-xs font-medium text-slate-400 no-scrollbar">
        {[
          { id: 'inbox', label: `Inbox & Notices (${unreadCount > 0 ? `${unreadCount} new` : myNotifications.length})` },
          { id: 'feed', label: `Opportunities & Bounties (${opportunityFeed.length + openBounties.length})` },
          { id: 'communities', label: `Communities & Invites (${joinedCommunityIds.size})` },
          { id: 'events', label: `Events & Polls (${events.length + polls.length})` },
          { id: 'tasks', label: `My Tasks (${myTasks.length})` },
          { id: 'commitments', label: `Commitments (${myCommitments.length})` },
          { id: 'passport', label: 'Passport, Privacy & Ranks' },
          { id: 'identity', label: lang === 'ar' ? 'ربط Discord & Telegram' : 'Connected Accounts' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 transition-colors ${
              activeSubTab === tab.id
                ? 'bg-indigo-600/25 text-indigo-300 font-bold border border-indigo-500/40'
                : 'hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {actionFeedback && (
        <div
          className={`rounded-xl border p-3 text-xs flex items-center justify-between gap-2 ${
            actionFeedback.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
              : 'border-rose-500/40 bg-rose-950/40 text-rose-300'
          }`}
        >
          <span>{actionFeedback.text}</span>
          <button type="button" onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-white px-1">
            ✕
          </button>
        </div>
      )}

      {/* SUBTAB 1: COMMUNITY INBOX & PINNED ANNOUNCEMENTS */}
      {activeSubTab === 'inbox' && (
        <div className="space-y-6">
          {/* Pinned & Recent Announcements */}
          {announcements.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
                <Megaphone className="h-3.5 w-3.5" />
                <span>Community Announcements</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {announcements.slice(0, 4).map((ann) => (
                  <div key={ann.id} className="rounded-xl border border-amber-800/40 bg-amber-950/15 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {ann.pinned && <Pin className="h-3.5 w-3.5 text-amber-400" />}
                        <span className="text-xs font-bold text-white">{ann.title}</span>
                      </div>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {ann.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{ann.message}</p>
                    <div className="text-[10px] font-mono text-slate-500">
                      {new Date(ann.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actionable Notifications */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Personal Notifications ({visibleNotifications.length})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInboxFilter(inboxFilter === 'all' ? 'unread' : 'all')}
                  className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300 hover:text-white"
                >
                  {inboxFilter === 'all' ? 'Show Unread Only' : 'Show All'}
                </button>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="rounded-md bg-indigo-600/20 border border-indigo-500/40 px-2.5 py-1 text-[11px] font-semibold text-indigo-300 hover:bg-indigo-600/30"
                  >
                    Mark All Read ({unreadCount})
                  </button>
                )}
              </div>
            </div>

            {visibleNotifications.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-8 text-center text-xs text-slate-400">
                Inbox is clean. No {inboxFilter === 'unread' ? 'unread ' : ''}alerts pending.
              </div>
            ) : (
              <div className="space-y-2.5">
                {visibleNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      notif.read ? 'border-slate-800 bg-slate-900/30' : 'border-indigo-600/50 bg-indigo-950/20'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{notif.title}</span>
                          {!notif.read && (
                            <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">
                              NEW
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300">{notif.message}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!notif.read && (
                          <button
                            type="button"
                            onClick={() => handleMarkNotificationRead(notif.id)}
                            className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300 hover:text-white whitespace-nowrap"
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          onClick={() => onSelectTab((notif.linkUrl || '/requests').replace(/^\//, ''))}
                          className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-white hover:bg-slate-700 whitespace-nowrap"
                        >
                          <span>Open</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-800/60 text-[11px] text-slate-500 font-mono flex items-center justify-between">
                      <span>Community: {notif.communityId || 'Global'}</span>
                      <span>{new Date(notif.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: OPPORTUNITY FEED, CLAIMABLE BOUNTIES & INLINE QUICK OFFER */}
      {activeSubTab === 'feed' && (
        <div className="space-y-6">
          {/* Claimable Open Bounties */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span>Open Claimable Bounties & Tasks ({openBounties.length})</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Unassigned tasks ready for immediate pickup — claim one to begin earning verified credentials.
                </p>
              </div>
            </div>

            {openBounties.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 text-center text-xs text-slate-400">
                No unassigned open bounties right now. Check matched requests below!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {openBounties.map((bounty) => (
                  <div key={bounty.id} className="rounded-xl border border-emerald-800/40 bg-emerald-950/15 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-white">{bounty.title}</h4>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Due {new Date(bounty.deadline).toLocaleDateString()} · {bounty.rewardRecognition || 'Verified Badge'}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700/50">
                        OPEN BOUNTY
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{bounty.description}</p>
                    <div className="flex justify-end pt-2 border-t border-slate-800/80">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleClaimBounty(bounty.id)}
                        className="rounded-md bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                      >
                        Claim Bounty Task
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inline Offer Submission Drawer */}
          {offeringRequestId && (
            <form onSubmit={handleSubmitQuickOffer} className="rounded-xl border border-indigo-500/50 bg-indigo-950/25 p-5 space-y-4">
              <h4 className="text-xs font-bold text-white">
                Submit Assistance Offer for: {requests.find((r) => r.id === offeringRequestId)?.title}
              </h4>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Proposed Approach & Deliverable Plan</label>
                <textarea
                  required
                  rows={3}
                  value={offerProposal}
                  onChange={(e) => setOfferProposal(e.target.value)}
                  placeholder="Describe how you will solve this need and what evidence you will provide..."
                  className="w-full rounded-md border border-slate-700 bg-slate-900 p-2.5 text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={offerHours}
                    onChange={(e) => setOfferHours(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Availability</label>
                  <input
                    type="text"
                    value={offerAvailability}
                    onChange={(e) => setOfferAvailability(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOfferingRequestId(null)} className="px-3 py-1.5 text-xs text-slate-400">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
                  {isSubmitting ? 'Submitting...' : 'Submit Offer'}
                </button>
              </div>
            </form>
          )}

          {/* Matched Help Requests */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">Matched NeedSignal Opportunities ({opportunityFeed.length})</h3>
            {opportunityFeed.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-8 text-center text-xs text-slate-400">
                No matching open opportunities currently.
              </div>
            ) : (
              <div className="space-y-3">
                {opportunityFeed.map((req) => {
                  const alreadyOffered = myOffers.some((o) => o.requestId === req.id);
                  return (
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

                        {alreadyOffered ? (
                          <span className="text-[11px] font-mono text-emerald-400">Offer Submitted</span>
                        ) : (
                          <button
                            onClick={() => setOfferingRequestId(req.id)}
                            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Submit Assistance Offer</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB: COMMUNITIES DISCOVERY & INVITE CODE REDEMPTION */}
      {activeSubTab === 'communities' && (
        <div className="space-y-6">
          <form onSubmit={handleRedeemInvite} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Redeem Community Invite Code</h3>
            </div>
            <p className="text-xs text-slate-400">
              Have an invite code from a group owner or Discord/Telegram admin? Enter it below to join immediately.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 max-w-lg">
              <input
                type="text"
                required
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
                placeholder="e.g., DEVFORGE-2026"
                className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white font-mono uppercase"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 whitespace-nowrap"
              >
                Redeem & Join
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {communities.map((comm) => {
              const isJoined = joinedCommunityIds.has(comm.id) || comm.ownerId === currentUser.id;
              const myMem = memberships.find((m) => m.communityId === comm.id && m.userId === currentUser.id);
              return (
                <div key={comm.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-white">{comm.name}</h4>
                      {isJoined ? (
                        <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700/40">
                          {comm.ownerId === currentUser.id ? 'OWNER' : (myMem?.role || 'MEMBER').toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                          OPEN
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{comm.description}</p>
                    <div className="text-[11px] text-slate-400 flex flex-wrap gap-2 pt-1">
                      <span>Category: {comm.category}</span>
                      <span>·</span>
                      <span>Discord: {comm.discordConfig?.connected ? 'Connected' : 'Off'}</span>
                      <span>·</span>
                      <span>Telegram: {comm.telegramConfig?.connected ? 'Connected' : 'Off'}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex justify-end">
                    {isJoined ? (
                      <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Active Member
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleJoinCommunity(comm.id)}
                        className="rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                      >
                        Join Community
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB: EVENTS RSVP & LIVE POLLS VOTING HUB */}
      {activeSubTab === 'events' && (
        <div className="space-y-6">
          {/* Active Polls */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Vote className="h-4 w-4 text-indigo-400" />
              <span>Community Polls & Governance Votes ({polls.length})</span>
            </h3>
            {polls.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 text-center text-xs text-slate-400">
                No active community polls right now.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {polls.map((poll) => {
                  const totalVotes = poll.alternatives.reduce((acc, a) => acc + a.votes.length, 0);
                  return (
                    <div key={poll.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-white">{poll.question}</h4>
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                          poll.status === 'open' ? 'bg-indigo-950 text-indigo-300' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {poll.status}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {poll.alternatives.map((alt) => {
                          const voted = alt.votes.includes(currentUser.id);
                          const pct = totalVotes > 0 ? Math.round((alt.votes.length / totalVotes) * 100) : 0;
                          return (
                            <button
                              key={alt.id}
                              type="button"
                              disabled={poll.status === 'closed'}
                              onClick={() => handleCastVote(poll.id, alt.id)}
                              className={`w-full text-left rounded-lg border p-2.5 text-xs transition-colors ${
                                voted
                                  ? 'border-indigo-500/60 bg-indigo-950/40 text-white'
                                  : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium">{alt.text}</span>
                                <span className="font-mono text-[11px] tabular-nums text-slate-400">
                                  {alt.votes.length} ({pct}%)
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                        Total Votes: {totalVotes}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-400" />
              <span>Upcoming Community Events ({events.length})</span>
            </h3>
            {events.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 text-center text-xs text-slate-400">
                No scheduled events yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.map((evt) => {
                  const hasRsvp = evt.rsvps.some((r) => r.userId === currentUser.id);
                  const isConfirmed = evt.confirmedAttendees.some((a) => a.userId === currentUser.id);
                  return (
                    <div key={evt.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-white">{evt.title}</h4>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-1">
                            <span>{new Date(evt.date).toLocaleString()}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-emerald-400" />
                              {evt.location}
                            </span>
                          </div>
                        </div>
                        {isConfirmed && (
                          <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded">
                            ATTENDED
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300">{evt.description}</p>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                        <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                          {evt.rsvps.length} RSVPs · {evt.confirmedAttendees.length} Confirmed
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleRsvp(evt.id)}
                          className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                            hasRsvp
                              ? 'border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-950'
                              : 'bg-indigo-600 text-white hover:bg-indigo-500'
                          }`}
                        >
                          {hasRsvp ? 'Going (Cancel RSVP)' : 'RSVP Now'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: MY TASKS, MILESTONES & HANDOFFS */}
      {activeSubTab === 'tasks' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Active deliverables assigned to you in QuestLoop. Toggle checklists, hand off tasks to teammates, and attach verifiable evidence URLs.
          </p>

          {/* Incoming Task Handoffs */}
          {incomingHandoffs.length > 0 && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 space-y-2.5">
              <h4 className="text-xs font-bold text-amber-300 flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                <span>Incoming Task Handoff Requests ({incomingHandoffs.length})</span>
              </h4>
              {incomingHandoffs.map((h) => (
                <div key={h.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-xs">
                  <div>
                    <div className="font-semibold text-white">Task ID: {h.taskId} (from {h.previousOwnerId})</div>
                    <p className="text-slate-300 text-[11px]">{h.contextNotes}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAcceptHandoff(h.id)}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 shrink-0"
                  >
                    Accept Handoff
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Request Handoff Drawer */}
          {handoffTaskId && (
            <form onSubmit={handleCreateHandoff} className="rounded-xl border border-slate-700 bg-slate-900/70 p-5 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-indigo-400" />
                <span>Request MoveSure Task Handoff</span>
              </h4>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Select Next Owner</label>
                <select
                  required
                  value={handoffTargetUserId}
                  onChange={(e) => setHandoffTargetUserId(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white"
                >
                  <option value="">Choose teammate...</option>
                  {users.filter((u) => u.id !== currentUser.id).map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Handoff Context & Progress Notes</label>
                <textarea
                  rows={2}
                  required
                  value={handoffNotes}
                  onChange={(e) => setHandoffNotes(e.target.value)}
                  placeholder="Share branch links, current status, and remaining blockers..."
                  className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setHandoffTaskId(null)} className="px-3 py-1.5 text-xs text-slate-400">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
                  Send Handoff Request
                </button>
              </div>
            </form>
          )}

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
                <button type="button" onClick={() => setCompletingTaskId(null)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">
                  Cancel
                </button>
                <button type="submit" className="rounded-md bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500">
                  Submit to Contribution Ledger
                </button>
              </div>
            </form>
          )}

          {myTasks.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-8 text-center text-xs text-slate-400 space-y-2">
              <p>No tasks currently assigned to your account.</p>
              {openBounties.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveSubTab('feed')}
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Browse {openBounties.length} Open Bounties
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {myTasks.map((task) => (
                <div key={task.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{task.title}</span>
                    <span
                      className={`text-[11px] font-mono capitalize px-2 py-0.5 rounded ${
                        task.status === 'completed' ? 'bg-emerald-950 text-emerald-300' : 'bg-indigo-950 text-indigo-300'
                      }`}
                    >
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">{task.description}</p>

                  <div className="space-y-1.5">
                    {task.checklist.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handleToggleChecklist(task.id, c.id, !c.completed)}
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

                  {task.status !== 'completed' && (
                    <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setHandoffTaskId(task.id)}
                        className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        <span>Hand Off Task</span>
                      </button>
                      <button
                        onClick={() => setCompletingTaskId(task.id)}
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

      {/* SUBTAB 5: MEMBER PASSPORT, PRIVACY EDITOR & PEER LEADERBOARD */}
      {activeSubTab === 'passport' && (
        <div className="space-y-6">
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

              <div className="shrink-0 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingPassport((p) => !p)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <Pencil className="h-3.5 w-3.5 text-indigo-400" />
                  <span>{isEditingPassport ? 'Cancel Edit' : 'Edit Passport & Privacy'}</span>
                </button>
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

            {isEditingPassport ? (
              <form onSubmit={handleSavePassport} className="space-y-4 pt-4 border-t border-slate-800">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Member Biography</label>
                  <textarea
                    rows={2}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-950 p-2.5 text-xs text-white"
                  />
                </div>

                {/* Skills editor */}
                <div className="space-y-2">
                  <label className="text-[11px] text-slate-300 block">Declared Skills</label>
                  <div className="flex flex-wrap gap-2">
                    {editSkills.map((sk, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-200">
                        <span>{sk.name}</span>
                        {!sk.verified && (
                          <button
                            type="button"
                            onClick={() => setEditSkills((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2 max-w-md">
                    <input
                      type="text"
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      placeholder="Add skill (e.g., Rust, Smart Contracts)..."
                      className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newSkillName.trim()) return;
                        setEditSkills((prev) => [...prev, { name: newSkillName.trim(), verified: false }]);
                        setNewSkillName('');
                      }}
                      className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-white hover:bg-slate-700"
                    >
                      + Add Skill
                    </button>
                  </div>
                </div>

                {/* Portfolio Links editor */}
                <div className="space-y-2">
                  <label className="text-[11px] text-slate-300 block">Portfolio Links</label>
                  <div className="space-y-1">
                    {editPortfolioLinks.map((url, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 text-xs bg-slate-950 px-3 py-1.5 rounded border border-slate-800">
                        <span className="truncate text-indigo-300">{url}</span>
                        <button
                          type="button"
                          onClick={() => setEditPortfolioLinks((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 max-w-md">
                    <input
                      type="url"
                      value={newPortfolioUrl}
                      onChange={(e) => setNewPortfolioUrl(e.target.value)}
                      placeholder="https://github.com/..."
                      className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newPortfolioUrl.trim()) return;
                        setEditPortfolioLinks((prev) => [...prev, newPortfolioUrl.trim()]);
                        setNewPortfolioUrl('');
                      }}
                      className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-white hover:bg-slate-700"
                    >
                      + Add Link
                    </button>
                  </div>
                </div>

                {/* Privacy Switches */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-800">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={editIsPublic} onChange={(e) => setEditIsPublic(e.target.checked)} />
                    <span>Make Public Passport Page Accessible</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPrivacy.showVerifiedOnly}
                      onChange={(e) => setEditPrivacy((p) => ({ ...p, showVerifiedOnly: e.target.checked }))}
                    />
                    <span>Show Verified Achievements Only</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPrivacy.allowDiscovery}
                      onChange={(e) => setEditPrivacy((p) => ({ ...p, allowDiscovery: e.target.checked }))}
                    />
                    <span>Allow Opportunity Matching Discovery</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPrivacy.allowCrossCommunitySharing}
                      onChange={(e) => setEditPrivacy((p) => ({ ...p, allowCrossCommunitySharing: e.target.checked }))}
                    />
                    <span>Allow Cross-Community Record Portability</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingPassport(false)}
                    className="px-3 py-1.5 text-xs text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Passport & Privacy'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Skills Taxonomy</span>
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
                      {(s.endorsementsCount || 0) > 0 && (
                        <span className="text-[10px] text-amber-300 font-mono tabular-nums">· {s.endorsementsCount} kudos</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Community Contributors Leaderboard & Peer Endorsements */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-400" />
                  <span>Community Contributors Leaderboard & Peer Kudos</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Ranked strictly by verified contributions, completed milestones, and peer endorsements.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 overflow-hidden">
              {leaderboard.map((entry, idx) => (
                <div key={entry.user.id} className="p-3.5 bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-400 tabular-nums">#{idx + 1}</span>
                      <span className="font-semibold text-white">{entry.user.name}</span>
                      <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                        ({entry.verifiedContribs} verified · {entry.completedTasks} tasks · {entry.totalEndorsements} kudos)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {entry.user.passport.skills.slice(0, 3).map((sk, sIdx) => (
                        <span key={sIdx} className="inline-flex items-center gap-1 rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                          <span>{sk.name}</span>
                          {entry.user.id !== currentUser.id && (
                            <button
                              type="button"
                              onClick={() => handleEndorsePeer(entry.user.id, sk.name)}
                              title={`Endorse ${entry.user.name} for ${sk.name}`}
                              className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-0.5 ml-1"
                            >
                              <ThumbsUp className="h-2.5 w-2.5" />
                              <span className="text-[10px] font-mono">+1</span>
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums shrink-0">
                    <span className="text-indigo-300 font-bold">{entry.score} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 6: CONNECTED ACCOUNTS & IDENTITY LINKING */}
      {activeSubTab === 'identity' && (
        <div className="space-y-6">
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
                <div className="space-y-2">
                  <div className="rounded-lg bg-slate-950 p-3 space-y-1 text-xs font-mono">
                    <div className="text-slate-300">@{currentUser.identities.discordUsername || 'discord_user'}</div>
                    <div className="text-[10px] text-slate-500">ID: {currentUser.identities.discordId}</div>
                  </div>
                  <a
                    href="/api/discord/connect?mode=user&redirect=true"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#5865F2]/40 bg-[#5865F2]/10 hover:bg-[#5865F2]/20 px-3 py-1 text-[11px] font-semibold text-[#8ea1ff] transition-all"
                  >
                    <Bot className="h-3 w-3" />
                    <span>{lang === 'ar' ? 'إعادة ربط / تبديل Discord' : 'Re-link / Switch Discord'}</span>
                  </a>
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
                <div className="space-y-2">
                  <div className="rounded-lg bg-slate-950 p-3 space-y-1 text-xs font-mono">
                    <div className="text-slate-300">@{currentUser.identities.telegramUsername || 'telegram_user'}</div>
                    <div className="text-[10px] text-slate-500">ID: {currentUser.identities.telegramId}</div>
                  </div>
                  <a
                    href="/api/auth/telegram/authorize?redirect=true"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#229ED9]/40 bg-[#229ED9]/10 hover:bg-[#229ED9]/20 px-3 py-1 text-[11px] font-semibold text-[#54bbf0] transition-all"
                  >
                    <Send className="h-3 w-3" />
                    <span>{lang === 'ar' ? 'إعادة ربط / تبديل Telegram' : 'Re-link / Switch Telegram'}</span>
                  </a>
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
                  Run <code className="text-indigo-300">/connect {createdChallengeCode}</code> inside{' '}
                  {challengePlatform === 'discord' ? 'Discord bot channel' : 'Telegram bot chat'} to complete authentication.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
