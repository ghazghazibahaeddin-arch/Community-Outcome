'use client';

import React, { useState, useEffect } from 'react';
import { translations } from '@/lib/i18n';
import {
  Community,
  CommunityMembership,
  NeedSignalRequest,
  Offer,
  PlanTask,
  Contribution,
  Dispute,
  KnowledgeArticle,
  CommunityLink,
  CommunityEvent,
  CommunityAnnouncement,
  CommunityInviteCode,
  ModerationAction,
  AuditLogItem,
  User,
  Language,
  OwnerActionItem,
  UserRole,
  DataMode,
  CommunitySubscription,
  PlanEntitlements
} from '@/lib/types';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Users,
  Settings,
  Bot,
  ArrowRight,
  Plus,
  ShieldCheck,
  Send,
  Sparkles,
  Megaphone,
  Pin,
  Ticket,
  Copy,
  Check,
  Calendar,
  MapPin,
  Search,
  Download,
  FileText,
  Scale,
  Ban,
  UserCheck,
  Trash2,
  ListTodo,
  XCircle
} from 'lucide-react';
import { CommunityConnectionCenter } from './CommunityConnectionCenter';
import { PricingPlansSection } from './PricingPlansSection';

interface OwnerWorkspaceProps {
  community: Community;
  currentUser: User;
  currentUserRole?: UserRole;
  users: User[];
  memberships?: CommunityMembership[];
  requests: NeedSignalRequest[];
  offers: Offer[];
  tasks: PlanTask[];
  contributions: Contribution[];
  disputes: Dispute[];
  knowledge: KnowledgeArticle[];
  links: CommunityLink[];
  events?: CommunityEvent[];
  announcements?: CommunityAnnouncement[];
  inviteCodes?: CommunityInviteCode[];
  auditLogs?: AuditLogItem[];
  moderationActions?: ModerationAction[];
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
  onOpenPrivacy?: () => void;
  onOpenCreateCommunity?: () => void;
  initialSection?:
    | 'operations'
    | 'announcements'
    | 'requests'
    | 'reviews'
    | 'disputes'
    | 'events'
    | 'roles'
    | 'config'
    | 'audit'
    | 'connect'
    | 'pricing';
}

export const OwnerWorkspace: React.FC<OwnerWorkspaceProps> = ({
  community,
  currentUser,
  currentUserRole = 'community_owner',
  users,
  memberships = [],
  requests,
  offers,
  tasks,
  contributions,
  disputes,
  links,
  events = [],
  announcements = [],
  inviteCodes = [],
  auditLogs = [],
  moderationActions = [],
  ownerActionItems,
  dataMode,
  lang,
  subscription,
  entitlements,
  onRefresh,
  onSelectTab,
  onSwitchToMemberSpace,
  onOpenPrivacy,
  onOpenCreateCommunity,
  initialSection
}) => {
  const _t = translations[lang];

  const [activeSection, setActiveSection] = useState<
    | 'operations'
    | 'announcements'
    | 'requests'
    | 'reviews'
    | 'disputes'
    | 'events'
    | 'roles'
    | 'config'
    | 'audit'
    | 'connect'
    | 'pricing'
  >(initialSection || 'operations');

  useEffect(() => {
    if (!initialSection) return;
    const timer = setTimeout(() => setActiveSection(initialSection), 0);
    return () => clearTimeout(timer);
  }, [initialSection]);

  // General Action Feedback
  const [isResettingData, setIsResettingData] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Role & Member Moderation State
  const [selectedUserForRole, setSelectedUserForRole] = useState<string>(
    users.find((u) => u.id !== community.ownerId)?.id || users[0]?.id || ''
  );
  const [selectedRole, setSelectedRole] = useState<UserRole>('reviewer');
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleSuccess, setRoleSuccess] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState<string>('');
  const [memberFilter, setMemberFilter] = useState<'all' | 'in_community' | 'staff' | 'members' | 'linked' | 'moderated'>('all');
  const [moderatingUserId, setModeratingUserId] = useState<string | null>(null);
  const [moderationType, setModerationType] = useState<'warn' | 'suspend' | 'reinstate' | 'remove'>('warn');
  const [moderationReason, setModerationReason] = useState<string>('');

  // Invite Code Generator State
  const [inviteRole, setInviteRole] = useState<UserRole>('member');
  const [inviteMaxUses, setInviteMaxUses] = useState<number>(25);
  const [inviteExpiryDays, setInviteExpiryDays] = useState<number>(30);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  // Announcement Composer State
  const [annTitle, setAnnTitle] = useState<string>('');
  const [annMessage, setAnnMessage] = useState<string>('');
  const [annCategory, setAnnCategory] = useState<'update' | 'urgent' | 'bounty' | 'event'>('update');
  const [annPinned, setAnnPinned] = useState<boolean>(false);
  const [annChannels, setAnnChannels] = useState({ inApp: true, discord: true, telegram: true });

  // Direct Task / Bounty Creator State
  const [showTaskForm, setShowTaskForm] = useState<boolean>(false);
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [taskDescription, setTaskDescription] = useState<string>('');
  const [taskAssigneeId, setTaskAssigneeId] = useState<string>('');
  const [taskDeadline, setTaskDeadline] = useState<string>(() => {
    const d = new Date(Date.now() + 7 * 86400000);
    return d.toISOString().split('T')[0];
  });
  const [taskReward, setTaskReward] = useState<string>('Verified Contributor Badge');
  const [taskChecklistRaw, setTaskChecklistRaw] = useState<string>('Complete core deliverable\nAttach verifiable link or PR');

  // Review Drawer State
  const [reviewingContribId, setReviewingContribId] = useState<string | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'verified' | 'rejected' | 'disputed'>('verified');
  const [reviewReason, setReviewReason] = useState<string>('');

  // Dispute Adjudication State
  const [resolvingDisputeId, setResolvingDisputeId] = useState<string | null>(null);
  const [disputeDecision, setDisputeDecision] = useState<'resolved' | 'appealed'>('resolved');
  const [disputeResolution, setDisputeResolution] = useState<string>('');

  // Event Creator State
  const [showEventForm, setShowEventForm] = useState<boolean>(false);
  const [eventTitle, setEventTitle] = useState<string>('');
  const [eventDescription, setEventDescription] = useState<string>('');
  const [eventDate, setEventDate] = useState<string>(() => {
    const d = new Date(Date.now() + 5 * 86400000);
    return d.toISOString().slice(0, 16);
  });
  const [eventLocation, setEventLocation] = useState<string>('Discord Stage / Web Hub');

  // Community Config Editor State
  const [configName, setConfigName] = useState<string>(community.name);
  const [configDesc, setConfigDesc] = useState<string>(community.description);
  const [configWelcome, setConfigWelcome] = useState<string>(community.welcomeMessage || '');
  const [configRules, setConfigRules] = useState<string[]>(community.rules || []);
  const [newRuleText, setNewRuleText] = useState<string>('');
  const [configCategories, setConfigCategories] = useState(community.contributionCategories || []);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatDesc, setNewCatDesc] = useState<string>('');
  const [newCatReview, setNewCatReview] = useState<boolean>(true);
  const [autoAnnounceOutcomes, setAutoAnnounceOutcomes] = useState<boolean>(
    Boolean(community.settings?.autoAnnounceVerifiedOutcomes)
  );
  const [requireInviteCode, setRequireInviteCode] = useState<boolean>(
    Boolean(community.settings?.requireInviteCode)
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setConfigName(community.name);
      setConfigDesc(community.description);
      setConfigWelcome(community.welcomeMessage || '');
      setConfigRules(community.rules || []);
      setConfigCategories(community.contributionCategories || []);
      setAutoAnnounceOutcomes(Boolean(community.settings?.autoAnnounceVerifiedOutcomes));
      setRequireInviteCode(Boolean(community.settings?.requireInviteCode));
    }, 0);
    return () => clearTimeout(timer);
  }, [community]);

  // Audit Log Search
  const [auditSearch, setAuditSearch] = useState<string>('');

  const effectiveSelectedUserForRole = users.some((u) => u.id === selectedUserForRole)
    ? selectedUserForRole
    : (users[0]?.id || '');

  const pendingContributions = contributions.filter((c) => c.reviewStatus === 'pending');
  const openDisputes = disputes.filter((d) => d.status === 'open' || d.status === 'investigating');
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
            Your role in <span className="text-amber-300 font-semibold">{community.name}</span> is{' '}
            <span className="font-mono uppercase font-bold text-white">{currentUserRole}</span>. Owner operations,
            triage queue, dispute adjudication, and bot configuration require Community Owner or Administrator privileges.
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

  // Helper to get user's real role & membership in this community
  const getMembershipForUser = (userId: string) =>
    memberships.find((m) => m.communityId === community.id && m.userId === userId);

  const getEffectiveRoleForUser = (user: User): UserRole => {
    if (user.id === community.ownerId) return 'community_owner';
    const mem = getMembershipForUser(user.id);
    if (mem) return mem.role;
    return user.platformRole === 'platform_admin' ? 'platform_admin' : 'member';
  };

  // Generic POST helper
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
  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoleError(null);
    setRoleSuccess(null);
    if (!effectiveSelectedUserForRole) {
      setRoleError('No member selected.');
      return;
    }
    try {
      await callApiAction('update_member_role', {
        communityId: community.id,
        userId: effectiveSelectedUserForRole,
        role: selectedRole
      });
      setRoleSuccess(`Assigned role "${selectedRole}" successfully.`);
      onRefresh();
    } catch (err: any) {
      setRoleError(err?.message || 'Failed to update member role');
    }
  };

  const handleModerateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moderatingUserId) return;
    setActionFeedback(null);
    setIsSubmitting(true);
    try {
      await callApiAction('moderate_member', {
        communityId: community.id,
        targetUserId: moderatingUserId,
        modAction: moderationType,
        reason: moderationReason || `Moderation action: ${moderationType}`
      });
      setActionFeedback({ type: 'success', text: `Member moderation "${moderationType}" recorded and notified.` });
      setModeratingUserId(null);
      setModerationReason('');
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Failed to moderate member.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionFeedback(null);
    setIsSubmitting(true);
    try {
      const data = await callApiAction('create_invite_code', {
        communityId: community.id,
        roleAssigned: inviteRole,
        maxUses: inviteMaxUses,
        expiresInDays: inviteExpiryDays
      });
      setActionFeedback({
        type: 'success',
        text: `Invite code ${data.result?.code || ''} generated for role "${inviteRole}".`
      });
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Failed to create invite code.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    setActionFeedback(null);
    try {
      await callApiAction('revoke_invite_code', { communityId: community.id, inviteId });
      setActionFeedback({ type: 'success', text: 'Invite code revoked.' });
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Failed to revoke invite code.' });
    }
  };

  const handleCopyInvite = async (invite: CommunityInviteCode, asLink = false) => {
    try {
      const value =
        asLink && typeof window !== 'undefined'
          ? `${window.location.origin}/?invite=${encodeURIComponent(invite.code)}`
          : invite.code;
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        setCopiedInviteId(asLink ? `${invite.id}_link` : invite.id);
        setTimeout(() => setCopiedInviteId(null), 2000);
      }
    } catch {}
  };

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMessage.trim()) return;
    setActionFeedback(null);
    setIsSubmitting(true);
    try {
      const data = await callApiAction('create_announcement', {
        communityId: community.id,
        title: annTitle,
        message: annMessage,
        category: annCategory,
        pinned: annPinned,
        channels: annChannels
      });
      const ds = data.result?.deliveryStatus;
      setActionFeedback({
        type: 'success',
        text: `Announcement published · In-App: ${ds?.inApp || 'sent'} · Discord: ${ds?.discord || 'skipped'} · Telegram: ${ds?.telegram || 'skipped'}`
      });
      setAnnTitle('');
      setAnnMessage('');
      setAnnPinned(false);
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Failed to publish announcement.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePinAnnouncement = async (announcementId: string) => {
    try {
      await callApiAction('toggle_announcement_pin', { communityId: community.id, announcementId });
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Failed to toggle pin.' });
    }
  };

  const handleCreateDirectTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setActionFeedback(null);
    setIsSubmitting(true);
    try {
      await callApiAction('create_task', {
        communityId: community.id,
        title: taskTitle,
        description: taskDescription || taskTitle,
        assigneeId: taskAssigneeId || undefined,
        deadline: new Date(taskDeadline).toISOString(),
        rewardRecognition: taskReward,
        checklistItems: taskChecklistRaw.split('\n').map((s) => s.trim()).filter(Boolean)
      });
      setActionFeedback({
        type: 'success',
        text: taskAssigneeId ? 'Direct task assigned and contributor notified.' : 'Open bounty published to Member Opportunity Feed.'
      });
      setShowTaskForm(false);
      setTaskTitle('');
      setTaskDescription('');
      setTaskAssigneeId('');
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Failed to create task.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingContribId || !reviewReason.trim()) return;
    setActionFeedback(null);
    try {
      await callApiAction('review_contribution', {
        contributionId: reviewingContribId,
        reviewerId: currentUser.id,
        decision: reviewDecision,
        reason: reviewReason
      });
      setReviewingContribId(null);
      setReviewReason('');
      setActionFeedback({ type: 'success', text: `Contribution marked as ${reviewDecision}.` });
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Failed to submit contribution review.' });
    }
  };

  const handleResolveDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingDisputeId || !disputeResolution.trim()) return;
    setActionFeedback(null);
    setIsSubmitting(true);
    try {
      await callApiAction('resolve_dispute', {
        disputeId: resolvingDisputeId,
        reviewerId: currentUser.id,
        decision: disputeDecision,
        resolution: disputeResolution
      });
      setActionFeedback({ type: 'success', text: `Dispute marked as ${disputeDecision} with immutable audit trail.` });
      setResolvingDisputeId(null);
      setDisputeResolution('');
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Failed to resolve dispute.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    setActionFeedback(null);
    try {
      await callApiAction('accept_offer', { offerId });
      setActionFeedback({ type: 'success', text: 'Offer accepted and QuestLoop deliverable task created.' });
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Failed to accept offer.' });
    }
  };

  const handleDeclineOffer = async (offerId: string) => {
    setActionFeedback(null);
    try {
      await callApiAction('decline_offer', { offerId, reason: 'Selected another candidate or adjusted scope.' });
      setActionFeedback({ type: 'success', text: 'Offer declined and contributor notified.' });
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Failed to decline offer.' });
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventDate) return;
    setActionFeedback(null);
    setIsSubmitting(true);
    try {
      await callApiAction('create_event', {
        communityId: community.id,
        title: eventTitle,
        description: eventDescription,
        date: new Date(eventDate).toISOString(),
        location: eventLocation
      });
      setActionFeedback({ type: 'success', text: 'Community event scheduled and published.' });
      setShowEventForm(false);
      setEventTitle('');
      setEventDescription('');
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Failed to schedule event.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmAttendance = async (eventId: string, userId: string) => {
    setActionFeedback(null);
    try {
      await callApiAction('confirm_event_attendance', {
        eventId,
        userId,
        evidenceNote: `Checked in by ${currentUser.name}`
      });
      setActionFeedback({ type: 'success', text: 'Attendee check-in confirmed.' });
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Failed to confirm attendance.' });
    }
  };

  const handleSaveCommunityConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionFeedback(null);
    setIsSubmitting(true);
    try {
      await callApiAction('update_community_config', {
        communityId: community.id,
        updates: {
          name: configName.trim() || community.name,
          description: configDesc.trim(),
          welcomeMessage: configWelcome.trim(),
          rules: configRules,
          contributionCategories: configCategories,
          settings: {
            autoAnnounceVerifiedOutcomes: autoAnnounceOutcomes,
            requireInviteCode: requireInviteCode,
            minPeerReviews: 1
          }
        }
      });
      setActionFeedback({ type: 'success', text: 'Community governance, rules, and taxonomy saved.' });
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Failed to save community configuration.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleDataMode = async (targetMode: DataMode) => {
    setIsResettingData(true);
    setActionFeedback(null);
    try {
      if (targetMode === 'production') {
        await callApiAction('reset_to_clean_production', { communityId: community.id });
      } else {
        await callApiAction('restore_demo_seed', {});
      }
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Failed to switch data mode.' });
    } finally {
      setIsResettingData(false);
    }
  };

  // CSV Export Utility
  const downloadCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const escapeCell = (val: string | number) => {
      const s = String(val ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csvContent = [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportMembersCsv = () => {
    const headers = ['User ID', 'Name', 'Email', 'Community Role', 'Moderation Status', 'Discord Linked', 'Telegram Linked', 'Verified Contributions'];
    const rows = users.map((u) => {
      const mem = getMembershipForUser(u.id);
      const role = getEffectiveRoleForUser(u);
      const contribCount = contributions.filter((c) => c.memberId === u.id && c.reviewStatus === 'verified').length;
      return [
        u.id,
        u.name,
        u.email,
        role,
        mem?.moderationStatus || 'active',
        u.identities?.discordUsername || (u.identities?.discordId ? 'Linked' : 'No'),
        u.identities?.telegramUsername || (u.identities?.telegramId ? 'Linked' : 'No'),
        contribCount
      ];
    });
    downloadCsv(`${community.slug || community.id}-members.csv`, headers, rows);
  };

  const handleExportOutcomesCsv = () => {
    const headers = ['Contribution ID', 'Title', 'Contributor ID', 'Status', 'Evidence URL', 'Reviewer', 'Submitted Date'];
    const rows = contributions.map((c) => [
      c.id,
      c.title,
      c.memberId,
      c.reviewStatus,
      c.evidence?.[0]?.url || '',
      c.reviewerId || '',
      c.submissionDate
    ]);
    downloadCsv(`${community.slug || community.id}-outcomes.csv`, headers, rows);
  };

  // Count members belonging specifically to this community
  const communityMembersCount = users.filter(
    (u) => u.id === community.ownerId || Boolean(getMembershipForUser(u.id))
  ).length;

  // Filtered Members for Member Directory
  const filteredMembers = users.filter((u) => {
    const mem = getMembershipForUser(u.id);
    const inCommunity = u.id === community.ownerId || Boolean(mem);
    const role = getEffectiveRoleForUser(u);
    const matchesSearch =
      !memberSearch.trim() ||
      u.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
      (u.identities?.discordUsername || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
      (u.identities?.telegramUsername || '').toLowerCase().includes(memberSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (memberFilter === 'in_community') return inCommunity;
    if (memberFilter === 'staff') return inCommunity && ['community_owner', 'admin', 'moderator', 'reviewer', 'task_manager'].includes(role);
    if (memberFilter === 'members') return inCommunity && (role === 'member' || role === 'expert');
    if (memberFilter === 'linked') return Boolean(u.identities?.discordId || u.identities?.telegramId);
    if (memberFilter === 'moderated') return mem?.moderationStatus === 'warned' || mem?.moderationStatus === 'suspended';
    return true;
  });

  const filteredAuditLogs = auditLogs.filter(
    (log) =>
      !auditSearch.trim() ||
      log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.details.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.actorId.toLowerCase().includes(auditSearch.toLowerCase())
  );

  const openBountiesCount = tasks.filter((t) => !t.assigneeId && t.status === 'todo').length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
      {/* Workspace Header & Zero-Fabrication Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              {lang === 'ar' ? 'مساحة مدير المجموعة' : 'Community Owner Workspace'}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400 font-mono">
              Managing: {community.name}
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-1">
            {lang === 'ar' ? 'مركز عمليات وإدارة المجتمع' : 'Community Operations & Governance Center'}
          </h2>
        </div>

        {/* Quick Role Switch + Zero-Fabrication Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onSwitchToMemberSpace && (
            <button
              type="button"
              onClick={onSwitchToMemberSpace}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition-colors whitespace-nowrap"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>{lang === 'ar' ? 'الانتقال لمساحة العضو' : 'Switch to Member Space'}</span>
            </button>
          )}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs font-mono shrink-0">
            <button
              onClick={() => handleToggleDataMode('demo')}
              disabled={isResettingData || dataMode === 'demo'}
              className={`px-3 py-1 rounded whitespace-nowrap transition-colors ${
                dataMode === 'demo' ? 'bg-amber-950/60 text-amber-300 font-bold border border-amber-800/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Demo Sandbox
            </button>
            <button
              onClick={() => handleToggleDataMode('production')}
              disabled={isResettingData || dataMode === 'production'}
              className={`px-3 py-1 rounded whitespace-nowrap transition-colors ${
                dataMode === 'production' ? 'bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-800/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Clean Production
            </button>
          </div>
        </div>
      </div>

      {/* Owner Workspace Sub-Navigation */}
      <div className="flex overflow-x-auto gap-1.5 border-b border-slate-800/80 pb-2.5 text-xs font-medium text-slate-400 no-scrollbar">
        {[
          { id: 'operations', label: `Priority Queue (${ownerActionItems.length})` },
          { id: 'connect', label: lang === 'ar' ? 'بوتات Discord و Telegram' : 'Discord & Telegram Bots', icon: Bot, highlight: 'indigo' },
          { id: 'announcements', label: `Broadcasts (${announcements.length})`, icon: Megaphone },
          { id: 'requests', label: `Requests & Bounties (${requests.length}/${openBountiesCount})` },
          { id: 'reviews', label: `Reviews (${pendingContributions.length})` },
          { id: 'disputes', label: `Shield Disputes (${openDisputes.length})` },
          { id: 'events', label: `Events (${events.length})`, icon: Calendar },
          { id: 'roles', label: `Members & Invites (${communityMembersCount})` },
          { id: 'config', label: 'Rules & Taxonomy' },
          { id: 'audit', label: 'Audit & Export' },
          { id: 'pricing', label: subscription?.tier === 'pro' ? 'Plans (PRO)' : 'Plans ($15/mo)', icon: Sparkles, highlight: 'amber' }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 ${
                active
                  ? tab.highlight === 'amber'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                    : 'bg-indigo-600/25 text-indigo-300 font-bold border border-indigo-500/40'
                  : 'hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
              <span>{tab.label}</span>
            </button>
          );
        })}
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
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-slate-400 hover:text-white px-1"
          >
            ✕
          </button>
        </div>
      )}

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
          onOpenCreateCommunity={onOpenCreateCommunity}
          onOpenPrivacy={onOpenPrivacy}
        />
      )}

      {/* SECTION 1: OPERATIONS CENTER PRIORITY QUEUE */}
      {activeSection === 'operations' && (
        <div className="space-y-6">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Active Members', value: communityMembersCount, tone: 'text-white' },
              { label: 'Pending Offers', value: pendingOffers.length, tone: pendingOffers.length > 0 ? 'text-amber-300' : 'text-white' },
              { label: 'Review Backlog', value: pendingContributions.length, tone: pendingContributions.length > 0 ? 'text-indigo-300' : 'text-white' },
              { label: 'Open Disputes', value: openDisputes.length, tone: openDisputes.length > 0 ? 'text-rose-400' : 'text-emerald-400' },
              { label: 'Active Links', value: links.filter(l => !l.isRevoked).length, tone: 'text-emerald-300' }
            ].map((stat, idx) => (
              <div key={idx} className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">{stat.label}</div>
                <div className={`text-xl font-bold tabular-nums mt-1 ${stat.tone}`}>{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Urgent community actions requiring owner decision, review, or dispute resolution.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveSection('announcements')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 whitespace-nowrap"
              >
                <Megaphone className="h-3.5 w-3.5" />
                <span>Send Announcement</span>
              </button>
              <button
                onClick={() => { setActiveSection('requests'); setShowTaskForm(true); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Task / Bounty</span>
              </button>
            </div>
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
            <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
              {ownerActionItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/60 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                          item.priority === 'urgent'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                            : item.priority === 'high'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {item.priority}
                      </span>
                      <h4 className="text-xs font-bold text-white">{item.title}</h4>
                    </div>
                    <p className="text-xs text-slate-400">{item.description}</p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {item.category === 'review' && (
                      <button
                        onClick={() => {
                          setReviewingContribId(item.targetId);
                          setActiveSection('reviews');
                        }}
                        className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 whitespace-nowrap"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Perform Audit</span>
                      </button>
                    )}
                    {item.category === 'offer' && (
                      <button
                        onClick={() => setActiveSection('requests')}
                        className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 whitespace-nowrap"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Triage Offer</span>
                      </button>
                    )}
                    {item.category === 'dispute' && (
                      <button
                        onClick={() => {
                          setResolvingDisputeId(item.targetId);
                          setActiveSection('disputes');
                        }}
                        className="flex items-center gap-1.5 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 whitespace-nowrap"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        <span>Adjudicate</span>
                      </button>
                    )}
                    {item.category === 'task' && (
                      <button
                        onClick={() => onSelectTab('tasks')}
                        className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white hover:bg-slate-700 whitespace-nowrap"
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

      {/* SECTION: ANNOUNCEMENTS & MULTI-CHANNEL BROADCASTS */}
      {activeSection === 'announcements' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form onSubmit={handlePublishAnnouncement} className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4 h-fit">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Broadcast Community Announcement</h3>
            </div>
            <p className="text-xs text-slate-400">
              Publish updates simultaneously to members&apos; In-App Inbox, linked Discord channel, and Telegram group.
            </p>

            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Announcement Title</label>
              <input
                type="text"
                required
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="e.g., Weekly Bounty Triage Live in 30m"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Category</label>
                <select
                  value={annCategory}
                  onChange={(e) => setAnnCategory(e.target.value as any)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="update">General Update</option>
                  <option value="urgent">Urgent Notice</option>
                  <option value="bounty">New Bounty Alert</option>
                  <option value="event">Event Reminder</option>
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={annPinned}
                    onChange={(e) => setAnnPinned(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-900"
                  />
                  <span>Pin to top of Feed</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Message Body</label>
              <textarea
                required
                rows={4}
                value={annMessage}
                onChange={(e) => setAnnMessage(e.target.value)}
                placeholder="Write clear instructions, links, or deadlines..."
                className="w-full rounded-md border border-slate-700 bg-slate-950 p-2.5 text-xs text-white"
              />
            </div>

            <div className="space-y-2 border-t border-slate-800 pt-3">
              <span className="text-[11px] font-mono uppercase text-slate-400 block">Target Delivery Channels</span>
              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                <span>In-App Member Inbox & Notifications</span>
                <input
                  type="checkbox"
                  checked={annChannels.inApp}
                  onChange={(e) => setAnnChannels((p) => ({ ...p, inApp: e.target.checked }))}
                />
              </label>
              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                <span>
                  Discord Channel ({community.discordConfig?.connected ? `#${community.discordConfig.channelId || 'linked'}` : 'Not linked'})
                </span>
                <input
                  type="checkbox"
                  checked={annChannels.discord}
                  onChange={(e) => setAnnChannels((p) => ({ ...p, discord: e.target.checked }))}
                />
              </label>
              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                <span>
                  Telegram Group ({community.telegramConfig?.connected ? community.telegramConfig.groupTitle : 'Not linked'})
                </span>
                <input
                  type="checkbox"
                  checked={annChannels.telegram}
                  onChange={(e) => setAnnChannels((p) => ({ ...p, telegram: e.target.checked }))}
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Broadcasting...' : 'Publish Announcement'}</span>
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3">
            <h3 className="text-sm font-bold text-white">Published Announcements ({announcements.length})</h3>
            {announcements.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-10 text-center text-xs text-slate-400">
                No announcements broadcast in {community.name} yet.
              </div>
            ) : (
              announcements.map((ann) => (
                <div key={ann.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {ann.pinned && <Pin className="h-3.5 w-3.5 text-amber-400" />}
                        <span className="text-xs font-bold text-white">{ann.title}</span>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {ann.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{ann.message}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTogglePinAnnouncement(ann.id)}
                      className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300 hover:text-white shrink-0"
                    >
                      {ann.pinned ? 'Unpin' : 'Pin'}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>In-App: {ann.deliveryStatus.inApp}</span>
                      <span>·</span>
                      <span>Discord: {ann.deliveryStatus.discord}</span>
                      <span>·</span>
                      <span>Telegram: {ann.deliveryStatus.telegram}</span>
                    </div>
                    <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: REQUEST PIPELINE, OFFERS TRIAGE & BOUNTY PUBLISHER */}
      {activeSection === 'requests' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">Requests, Offers & Direct Bounties</h3>
              <p className="text-xs text-slate-400">
                Publish claimable open bounties, assign tasks directly, or triage pending member offers.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTaskForm((p) => !p)}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{showTaskForm ? 'Close Bounty Form' : 'Publish Direct Task / Bounty'}</span>
              </button>
              <button
                onClick={() => onSelectTab('requests')}
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 whitespace-nowrap"
              >
                <span>NeedSignal Studio</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {showTaskForm && (
            <form onSubmit={handleCreateDirectTask} className="rounded-xl border border-indigo-500/40 bg-indigo-950/20 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-indigo-400" />
                <h4 className="text-xs font-bold text-white">Create Direct Task or Open Claimable Bounty</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Task / Bounty Title</label>
                  <input
                    type="text"
                    required
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="e.g., Audit Discord webhook signature verification"
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Assignee (leave blank for Open Claimable Bounty)</label>
                  <select
                    value={taskAssigneeId}
                    onChange={(e) => setTaskAssigneeId(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="">Open Bounty (Any Member Can Claim)</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Description & Scope</label>
                <textarea
                  rows={2}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Explain deliverables and context..."
                  className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Deadline</label>
                  <input
                    type="date"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Recognition / Bounty Reward</label>
                  <input
                    type="text"
                    value={taskReward}
                    onChange={(e) => setTaskReward(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Checklist Milestones (one per line)</label>
                <textarea
                  rows={2}
                  value={taskChecklistRaw}
                  onChange={(e) => setTaskChecklistRaw(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-xs text-white font-mono"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTaskForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Task'}
                </button>
              </div>
            </form>
          )}

          {/* Pending Offers Inline Triage */}
          {pendingOffers.length > 0 && (
            <div className="rounded-xl border border-amber-800/50 bg-amber-950/15 p-4 space-y-3">
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Pending Assistance Offers Awaiting Decision ({pendingOffers.length})
              </h4>
              <div className="space-y-2">
                {pendingOffers.map((off) => {
                  const req = requests.find((r) => r.id === off.requestId);
                  const member = users.find((u) => u.id === off.memberId);
                  return (
                    <div key={off.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-white">
                          {member?.name || off.memberId} offered {off.estimatedHours}h on &ldquo;{req?.title || off.requestId}&rdquo;
                        </div>
                        <p className="text-xs text-slate-400">{off.proposedHelp}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleAcceptOffer(off.id)}
                          className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500 whitespace-nowrap"
                        >
                          Accept & Assign
                        </button>
                        <button
                          onClick={() => handleDeclineOffer(off.id)}
                          className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:text-white whitespace-nowrap"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                    <span className="text-indigo-400 font-mono tabular-nums">{reqOffers.length} offer(s)</span>
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
                      className="text-indigo-400 hover:text-indigo-300 underline truncate"
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

      {/* SECTION 4: COMMUNITY SHIELD DISPUTES (INTERACTIVE RESOLUTION) */}
      {activeSection === 'disputes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Adjudicate contested deliverables with immutable audit trails and formal resolution notes.
            </p>
            <button
              onClick={() => onSelectTab('trust')}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <span>Open TrustGraph</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {resolvingDisputeId && (
            <form onSubmit={handleResolveDispute} className="rounded-xl border border-rose-600/50 bg-rose-950/20 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-rose-400" />
                <h4 className="text-xs font-bold text-white">Community Shield Dispute Adjudication</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Adjudication Status</label>
                  <select
                    value={disputeDecision}
                    onChange={(e) => setDisputeDecision(e.target.value as any)}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="resolved">Resolved (Binding Decision)</option>
                    <option value="appealed">Escalated / Appealed</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Adjudicating Officer</label>
                  <input
                    type="text"
                    disabled
                    value={`${currentUser.name} (${currentUser.id})`}
                    className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Formal Resolution Notes</label>
                <textarea
                  required
                  rows={3}
                  value={disputeResolution}
                  onChange={(e) => setDisputeResolution(e.target.value)}
                  placeholder="Document verified evidence, findings, and outcome..."
                  className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResolvingDisputeId(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
                >
                  Record Official Ruling
                </button>
              </div>
            </form>
          )}

          {disputes.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-8 text-center text-xs text-slate-400">
              Zero active disputes. All community outcomes are uncontested.
            </div>
          ) : (
            disputes.map((d) => (
              <div key={d.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white">Dispute on Contribution {d.contributionId}</span>
                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 rounded capitalize ${
                      d.status === 'resolved'
                        ? 'bg-emerald-950 text-emerald-300'
                        : 'bg-rose-950 text-rose-300'
                    }`}
                  >
                    {d.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{d.reason}</p>
                {d.resolutionNotes && (
                  <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-3 text-xs text-emerald-200">
                    <span className="font-semibold">Resolution:</span> {d.resolutionNotes}
                  </div>
                )}
                {d.auditTrail && d.auditTrail.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] font-mono uppercase text-slate-500 block">Audit Trail</span>
                    {d.auditTrail.map((entry, idx) => (
                      <div key={idx} className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
                        <span>{entry.action} ({entry.actorId})</span>
                        <span>{new Date(entry.timestamp).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
                  <span>Filed by {d.filedById} on {new Date(d.createdAt).toLocaleDateString()}</span>
                  {d.status !== 'resolved' && (
                    <button
                      onClick={() => setResolvingDisputeId(d.id)}
                      className="rounded-md bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-500"
                    >
                      Resolve Dispute
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SECTION: EVENTS & ATTENDANCE CHECK-IN */}
      {activeSection === 'events' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Community Events & Verified Attendance</h3>
              <p className="text-xs text-slate-400">Schedule Discord stages, workshops, or sprints and verify member attendance.</p>
            </div>
            <button
              onClick={() => setShowEventForm((p) => !p)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{showEventForm ? 'Close Form' : 'Schedule Event'}</span>
            </button>
          </div>

          {showEventForm && (
            <form onSubmit={handleCreateEvent} className="rounded-xl border border-indigo-500/40 bg-indigo-950/20 p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Event Title</label>
                  <input
                    type="text"
                    required
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="e.g., Community Townhall & Release Demo"
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Location / Channel</label>
                <input
                  type="text"
                  required
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Agenda / Description</label>
                <textarea
                  rows={2}
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowEventForm(false)} className="px-3 py-1.5 text-xs text-slate-400">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
                  Publish Event
                </button>
              </div>
            </form>
          )}

          {events.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-10 text-center text-xs text-slate-400">
              No events scheduled in {community.name} yet.
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((evt) => (
                <div key={evt.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white">{evt.title}</h4>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-indigo-400" />
                          {new Date(evt.date).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-emerald-400" />
                          {evt.location}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
                      <span className="rounded bg-indigo-950 px-2.5 py-1 text-indigo-300 border border-indigo-800/50">
                        {evt.rsvps.length} RSVPs
                      </span>
                      <span className="rounded bg-emerald-950 px-2.5 py-1 text-emerald-300 border border-emerald-800/50">
                        {evt.confirmedAttendees.length} Checked In
                      </span>
                    </div>
                  </div>
                  {evt.description && <p className="text-xs text-slate-300">{evt.description}</p>}

                  {evt.rsvps.length > 0 && (
                    <div className="pt-3 border-t border-slate-800/80 space-y-2">
                      <span className="text-[11px] font-mono uppercase text-slate-400 block">RSVP Roster & Check-In</span>
                      <div className="flex flex-wrap gap-2">
                        {evt.rsvps.map((r) => {
                          const attendee = users.find((u) => u.id === r.userId);
                          const isCheckedIn = evt.confirmedAttendees.some((a) => a.userId === r.userId);
                          return (
                            <div
                              key={r.userId}
                              className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs"
                            >
                              <span className="text-slate-200">{attendee?.name || r.userId}</span>
                              {isCheckedIn ? (
                                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Verified
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleConfirmAttendance(evt.id, r.userId)}
                                  className="text-[10px] font-mono bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-0.5 rounded"
                                >
                                  Check In
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 5: MEMBER DIRECTORY, ROLES, MODERATION & INVITES */}
      {activeSection === 'roles' && (
        <div className="space-y-6">
          {/* Role Assignment */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Assign Granular Community Role
            </h3>
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
                  value={effectiveSelectedUserForRole}
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
                  <option value="event_organizer">Event Organizer</option>
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

          {/* Moderation Drawer */}
          {moderatingUserId && (
            <form onSubmit={handleModerateMember} className="rounded-xl border border-amber-600/50 bg-amber-950/20 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white">
                  Moderate Member: {users.find((u) => u.id === moderatingUserId)?.name || moderatingUserId}
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Moderation Action</label>
                  <select
                    value={moderationType}
                    onChange={(e) => setModerationType(e.target.value as any)}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="warn">Issue Formal Warning</option>
                    <option value="suspend">Suspend Participation</option>
                    <option value="reinstate">Reinstate Active Standing</option>
                    <option value="remove">Remove from Community</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Audit Reason (sent to member)</label>
                  <input
                    type="text"
                    required
                    value={moderationReason}
                    onChange={(e) => setModerationReason(e.target.value)}
                    placeholder="Reason for warning/suspension/reinstatement..."
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setModeratingUserId(null)} className="px-3 py-1.5 text-xs text-slate-400">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="rounded-md bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-500">
                  Apply Moderation
                </button>
              </div>
            </form>
          )}

          {/* Member Directory with Real Roles, Platform Badges, Search & Moderation */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-400" />
                <span>Member Directory & Moderation ({filteredMembers.length})</span>
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search name, email, @handle..."
                    className="rounded-md border border-slate-700 bg-slate-950 pl-8 pr-3 py-1 text-xs text-white"
                  />
                </div>
                <select
                  value={memberFilter}
                  onChange={(e) => setMemberFilter(e.target.value as any)}
                  className="rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-200"
                >
                  <option value="all">All Accounts ({users.length})</option>
                  <option value="in_community">In {community.name} ({communityMembersCount})</option>
                  <option value="staff">Staff & Reviewers</option>
                  <option value="members">Members & Experts</option>
                  <option value="linked">Discord/TG Linked</option>
                  <option value="moderated">Warned / Suspended</option>
                </select>
              </div>
            </div>

            <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 overflow-hidden">
              {filteredMembers.map((u) => {
                const mem = getMembershipForUser(u.id);
                const inCommunity = u.id === community.ownerId || Boolean(mem);
                const role = getEffectiveRoleForUser(u);
                const modStatus = mem?.moderationStatus || 'active';
                return (
                  <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-900/60 text-xs">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-white">{u.name}</span>
                        <span className="font-mono text-[10px] uppercase bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800/50">
                          {role.replace('_', ' ')}
                        </span>
                        <span
                          className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded border ${
                            inCommunity
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {inCommunity ? 'In Community' : 'Platform Directory'}
                        </span>
                        {modStatus !== 'active' && (
                          <span className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded ${
                            modStatus === 'suspended' ? 'bg-rose-950 text-rose-300' : 'bg-amber-950 text-amber-300'
                          }`}>
                            {modStatus} ({mem?.warningsCount || 0} warn)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2">
                        <span>{u.email}</span>
                        <span>·</span>
                        <span className={u.identities?.discordId ? 'text-indigo-300' : 'text-slate-500'}>
                          Discord: {u.identities?.discordUsername || (u.identities?.discordId ? 'Linked' : 'Unlinked')}
                        </span>
                        <span>·</span>
                        <span className={u.identities?.telegramId ? 'text-sky-300' : 'text-slate-500'}>
                          Telegram: {u.identities?.telegramUsername ? `@${u.identities.telegramUsername}` : (u.identities?.telegramId ? 'Linked' : 'Unlinked')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {u.id !== community.ownerId && (
                        <button
                          type="button"
                          onClick={() => {
                            setModeratingUserId(u.id);
                            setModerationType(modStatus === 'suspended' ? 'reinstate' : 'warn');
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] text-slate-200 whitespace-nowrap"
                        >
                          <Ban className="h-3 w-3 text-amber-400" />
                          <span>Moderate</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Invite Code Generator & Registry */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Community Invite Codes & Role Onboarding Links
              </h3>
            </div>

            <form onSubmit={handleCreateInvite} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Role Assigned</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="member">Member</option>
                  <option value="expert">Expert</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="moderator">Moderator</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Max Uses</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={inviteMaxUses}
                  onChange={(e) => setInviteMaxUses(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white tabular-nums"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Expires (Days)</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={inviteExpiryDays}
                  onChange={(e) => setInviteExpiryDays(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white tabular-nums"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 whitespace-nowrap"
                >
                  Generate Invite Code
                </button>
              </div>
            </form>

            {inviteCodes.length > 0 && (
              <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 overflow-hidden">
                {inviteCodes.map((inv) => (
                  <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/60 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800/50">
                        {inv.code}
                      </span>
                      <div className="text-[11px] text-slate-400">
                        Role: <span className="text-slate-200 font-mono">{inv.roleAssigned}</span> · Uses:{' '}
                        <span className="tabular-nums text-white">{inv.usesCount}/{inv.maxUses}</span>
                        {inv.isRevoked && <span className="ml-2 text-rose-400 font-mono">(REVOKED)</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyInvite(inv, false)}
                        className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] text-slate-200 hover:text-white"
                      >
                        {copiedInviteId === inv.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedInviteId === inv.id ? 'Copied' : 'Copy Code'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyInvite(inv, true)}
                        className="inline-flex items-center gap-1 rounded border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-1 text-[11px] text-indigo-300 hover:bg-indigo-500/20"
                      >
                        {copiedInviteId === `${inv.id}_link` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedInviteId === `${inv.id}_link` ? 'Link Copied' : 'Copy Invite Link'}</span>
                      </button>
                      {!inv.isRevoked && (
                        <button
                          type="button"
                          onClick={() => handleRevokeInvite(inv.id)}
                          className="rounded border border-rose-800/50 bg-rose-950/30 px-2.5 py-1 text-[11px] text-rose-300 hover:bg-rose-950"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 6: INTERACTIVE COMMUNITY RULES, TAXONOMY & AUTOMATION */}
      {activeSection === 'config' && (
        <form onSubmit={handleSaveCommunityConfig} className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Settings className="h-4 w-4 text-indigo-400" />
              <span>Community Profile, Welcome & Automation</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Community Name</label>
                <input
                  type="text"
                  value={configName}
                  onChange={(e) => setConfigName(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Member Onboarding Welcome Message</label>
                <input
                  type="text"
                  value={configWelcome}
                  onChange={(e) => setConfigWelcome(e.target.value)}
                  placeholder="Welcome! Link Discord or Telegram in Member Space to start."
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Community Description</label>
              <textarea
                rows={2}
                value={configDesc}
                onChange={(e) => setConfigDesc(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-xs text-white"
              />
            </div>
            <div className="flex flex-wrap gap-6 pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAnnounceOutcomes}
                  onChange={(e) => setAutoAnnounceOutcomes(e.target.checked)}
                />
                <span>Auto-announce verified outcomes to connected Discord/Telegram</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireInviteCode}
                  onChange={(e) => setRequireInviteCode(e.target.checked)}
                />
                <span>Require invite code for new member onboarding</span>
              </label>
            </div>
          </div>

          {/* Community Rules Editor */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Community Governance Rules</h3>
            <div className="space-y-2">
              {configRules.map((rule, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-200">
                  <span>{idx + 1}. {rule}</span>
                  <button
                    type="button"
                    onClick={() => setConfigRules((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newRuleText}
                onChange={(e) => setNewRuleText(e.target.value)}
                placeholder="Add new community rule..."
                className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newRuleText.trim()) return;
                  setConfigRules((prev) => [...prev, newRuleText.trim()]);
                  setNewRuleText('');
                }}
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white hover:bg-slate-700 whitespace-nowrap"
              >
                + Add Rule
              </button>
            </div>
          </div>

          {/* Contribution Categories Taxonomy Editor */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Contribution Taxonomy Rules (MOD-1)
            </h3>
            <div className="space-y-2">
              {configCategories.map((cat) => (
                <div key={cat.id} className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-white">{cat.name}</span>
                    <p className="text-slate-400 text-[11px]">{cat.description}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cat.requiresReview}
                        onChange={(e) =>
                          setConfigCategories((prev) =>
                            prev.map((c) => (c.id === cat.id ? { ...c, requiresReview: e.target.checked } : c))
                          )
                        }
                      />
                      <span>Peer Review Required</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setConfigCategories((prev) => prev.filter((c) => c.id !== cat.id))}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Category name..."
                className="rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white"
              />
              <input
                type="text"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                placeholder="Description..."
                className="sm:col-span-2 rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newCatName.trim()) return;
                  setConfigCategories((prev) => [
                    ...prev,
                    {
                      id: `cat_${Date.now()}`,
                      name: newCatName.trim(),
                      nameAr: newCatName.trim(),
                      description: newCatDesc.trim() || 'Custom community contribution category',
                      requiresReview: newCatReview
                    }
                  ]);
                  setNewCatName('');
                  setNewCatDesc('');
                }}
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white hover:bg-slate-700 whitespace-nowrap"
              >
                + Add Category
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              {isSubmitting ? 'Saving Configuration...' : 'Save Community Configuration'}
            </button>
          </div>
        </form>
      )}

      {/* SECTION: AUDIT LOGS & CSV COMPLIANCE EXPORTS */}
      {activeSection === 'audit' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-400" />
                <span>Immutable Audit Log & Compliance Exports</span>
              </h3>
              <p className="text-xs text-slate-400">
                Inspect administrative, moderation, and verification events or download CSV reports.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportMembersCsv}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-medium text-white whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" />
                <span>Export Members CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportOutcomesCsv}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-medium text-white whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5 text-indigo-400" />
                <span>Export Outcomes CSV</span>
              </button>
            </div>
          </div>

          {moderationActions.length > 0 && (
            <div className="rounded-xl border border-amber-900/40 bg-amber-950/15 p-4 space-y-2">
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">Recent Moderation Actions</h4>
              <div className="space-y-1.5">
                {moderationActions.slice(0, 5).map((m) => (
                  <div key={m.id} className="text-xs text-slate-300 flex items-center justify-between font-mono">
                    <span>[{m.action.toUpperCase()}] User {m.targetUserId}: {m.reason}</span>
                    <span className="text-slate-500">{new Date(m.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
            <div className="relative max-w-sm">
              <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-2" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Filter audit action, actor, details..."
                className="w-full rounded-md border border-slate-700 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-white"
              />
            </div>

            <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 overflow-hidden">
              {filteredAuditLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No audit records match your filter.</div>
              ) : (
                filteredAuditLogs.slice(0, 50).map((log) => (
                  <div key={log.id} className="p-3 bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] bg-slate-800 text-indigo-300 px-2 py-0.5 rounded">
                          {log.action}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">Actor: {log.actorId}</span>
                      </div>
                      <p className="text-slate-200">{log.details}</p>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 shrink-0">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
