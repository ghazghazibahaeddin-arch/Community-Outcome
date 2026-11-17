'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header, WorkspaceMode } from '@/components/Header';
import { CommunityHero } from '@/components/CommunityHero';
import { OwnerWorkspace } from '@/components/OwnerWorkspace';
import { MemberWorkspace } from '@/components/MemberWorkspace';
import { CreateCommunityModal } from '@/components/CreateCommunityModal';
import { NeedSignalSection } from '@/components/NeedSignalSection';
import { QuestLoopSection } from '@/components/QuestLoopSection';
import { Poll2PlanSection } from '@/components/Poll2PlanSection';
import { TrustGraphSection } from '@/components/TrustGraphSection';
import { PassportPortfolioSection } from '@/components/PassportPortfolioSection';
import { LinkManagerSection } from '@/components/LinkManagerSection';
import { KnowledgeSection } from '@/components/KnowledgeSection';
import { OwnerAnalyticsSection } from '@/components/OwnerAnalyticsSection';
import { IntegrationsSection } from '@/components/IntegrationsSection';
import { TestingSuiteSection } from '@/components/TestingSuiteSection';
import { AuthPortal } from '@/components/AuthPortal';
import { AccountSettingsModal } from '@/components/AccountSettingsModal';
import { OnboardingChoiceModal } from '@/components/OnboardingChoiceModal';
import { PricingPlansSection } from '@/components/PricingPlansSection';
import { DeviceAccessCenter, DeviceExperienceMode } from '@/components/DeviceAccessCenter';
import { PrivacyPoliciesSection } from '@/components/PrivacyPoliciesSection';

import { translations } from '@/lib/i18n';
import {
  Community,
  NeedSignalRequest,
  Offer,
  PlanTask,
  TaskHandoff,
  Intent,
  Poll,
  Commitment,
  Contribution,
  MutualAttestation,
  Dispute,
  OutcomePortfolioItem,
  OutcomeRecord,
  KnowledgeArticle,
  TrustedSourceCard,
  CommunityLink,
  AgentKitWorkflow,
  DiscordCommandTest,
  MiniAppTestRun,
  User,
  Language,
  OwnerActionItem,
  DataMode,
  IdentityChallenge,
  NotificationItem,
  UserRole,
  CommunitySubscription,
  CommunityMembership,
  CommunityAnnouncement,
  CommunityInviteCode,
  ModerationAction,
  CommunityEvent,
  AuditLogItem
} from '@/lib/types';
import { CommunityOutcomeAnalytics } from '@/lib/services/analytics';
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  MessageSquare,
  LayoutGrid,
  CreditCard,
  MonitorSmartphone,
  Lock,
  Shield,
  Award,
  Link2,
  BookOpen,
  BarChart3,
  Bot,
  FlaskConical,
  ListChecks,
  Compass
} from 'lucide-react';

export default function HomePage() {
  const [lang, setLang] = useState<Language>('en');
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('hub');
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('owner');
  const [deviceMode, setDeviceMode] = useState<DeviceExperienceMode>('auto');
  const [ownerSection, setOwnerSection] = useState<'operations' | 'connect' | 'pricing'>('operations');
  const [memberSubTab, setMemberSubTab] = useState<
    'inbox' | 'feed' | 'communities' | 'events' | 'tasks' | 'commitments' | 'passport' | 'identity'
  >('inbox');
  const explicitTabRef = React.useRef<boolean>(false);
  const explicitWorkspaceIntentRef = React.useRef<'owner' | 'member' | null>(null);
  const hasAppliedInitialRoleRef = React.useRef<boolean>(false);
  const [dataMode, setDataMode] = useState<DataMode>('demo');
  const [currentCommunityId, setCurrentCommunityId] = useState<string>('comm_devforge');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isCreateCommunityOpen, setIsCreateCommunityOpen] = useState<boolean>(false);

  // Real Authenticated User State
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('guest');
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [onboardingInitialPath, setOnboardingInitialPath] = useState<'owner' | 'member' | undefined>(undefined);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // App Data States
  const [communities, setCommunities] = useState<Community[]>([]);
  const [currentCommunity, setCurrentCommunity] = useState<Community | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<NeedSignalRequest[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [handoffs, setHandoffs] = useState<TaskHandoff[]>([]);
  const [intents, setIntents] = useState<Intent[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [attestations, setAttestations] = useState<MutualAttestation[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<OutcomePortfolioItem[]>([]);
  const [outcomes, setOutcomes] = useState<OutcomeRecord[]>([]);
  const [links, setLinks] = useState<CommunityLink[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeArticle[]>([]);
  const [sourceCards, setSourceCards] = useState<TrustedSourceCard[]>([]);
  const [agentKits, setAgentKits] = useState<AgentKitWorkflow[]>([]);
  const [recoveryCandidates, setRecoveryCandidates] = useState<any[]>([]);
  const [discordTests, setDiscordTests] = useState<DiscordCommandTest[]>([]);
  const [miniAppTests, setMiniAppTests] = useState<MiniAppTestRun[]>([]);
  const [ownerActionItems, setOwnerActionItems] = useState<OwnerActionItem[]>([]);
  const [identityChallenges, setIdentityChallenges] = useState<IdentityChallenge[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [memberships, setMemberships] = useState<CommunityMembership[]>([]);
  const [announcements, setAnnouncements] = useState<CommunityAnnouncement[]>([]);
  const [inviteCodes, setInviteCodes] = useState<CommunityInviteCode[]>([]);
  const [moderationActions, setModerationActions] = useState<ModerationAction[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [subscription, setSubscription] = useState<CommunitySubscription | undefined>(undefined);
  const [entitlements, setEntitlements] = useState<any>(undefined);
  const [analytics, setAnalytics] = useState<CommunityOutcomeAnalytics>({
    totalRequests: 0,
    requestsWithOffers: 0,
    offersAccepted: 0,
    tasksAssigned: 0,
    tasksCompleted: 0,
    verifiedOutcomes: 0,
    disputedRecords: 0,
    uniqueContributors: 0,
    reviewBacklog: 0,
    firstMeaningfulActionsCount: 0,
    avgHoursToFirstOffer: 0,
    avgHoursToTaskCompletion: 0,
    categoryBreakdown: [],
    linkTotals: { visits: 0, starts: 0, submissions: 0, completions: 0, verifiedOutcomes: 0 },
    eventAttendanceRate: 0
  });

  // Clean up any legacy localStorage tokens on load and handle OAuth callback URL parameters
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('community_os_session_token');
      const urlParams = new URLSearchParams(window.location.search);
      const tab = urlParams.get('tab');
      const section = urlParams.get('section');
      const onboarding = urlParams.get('onboarding');
      const subtab = urlParams.get('subtab');
      const connectedPlatform = urlParams.get('connected_platform');
      const guildId = urlParams.get('guild_id');
      const guildName = urlParams.get('guild_name');
      const loginSuccess = urlParams.get('login_success');
      const provider = urlParams.get('provider');
      const accountUpdated = urlParams.get('account_updated');
      const connected = urlParams.get('connected');
      const oauthError = urlParams.get('discord_error') || urlParams.get('auth_error');

      const isDiscordGuildConnected = connectedPlatform === 'discord' && Boolean(guildId);
      const isIdentityLinkedRedirect =
        subtab === 'identity' || accountUpdated === 'discord_linked' || connected === 'telegram';

      const isKnownTab =
        tab === 'member' ||
        tab === 'owner' ||
        tab === 'modules' ||
        tab === 'billing' ||
        tab === 'pricing' ||
        tab === 'devices' ||
        tab === 'privacy';

      if (isKnownTab || isDiscordGuildConnected || isIdentityLinkedRedirect) {
        explicitTabRef.current = true;
        if (tab === 'owner' || isDiscordGuildConnected) {
          explicitWorkspaceIntentRef.current = 'owner';
        } else if (tab === 'member') {
          explicitWorkspaceIntentRef.current = 'member';
        }
      }

      // Clean transient callback params from address bar without reload
      const transientKeys = [
        'session_token',
        'tab',
        'section',
        'onboarding',
        'subtab',
        'connected_platform',
        'guild_id',
        'guild_name',
        'status',
        'login_success',
        'provider',
        'account_updated',
        'connected',
        'discord_status'
      ];
      let urlChanged = false;
      for (const k of transientKeys) {
        if (urlParams.has(k)) {
          urlParams.delete(k);
          urlChanged = true;
        }
      }
      if (urlChanged) {
        const cleanUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : '');
        window.history.replaceState({}, document.title, cleanUrl);
      }

      if (
        isKnownTab ||
        section ||
        onboarding ||
        isDiscordGuildConnected ||
        oauthError ||
        loginSuccess ||
        accountUpdated ||
        connected ||
        subtab === 'identity'
      ) {
        const timer = setTimeout(() => {
          if (tab === 'owner' || isDiscordGuildConnected) {
            setWorkspaceMode('owner');
          } else if (tab === 'member' || isIdentityLinkedRedirect) {
            setWorkspaceMode('member');
          } else if (tab === 'modules') {
            setWorkspaceMode('modules');
          } else if (tab === 'billing' || tab === 'pricing') {
            setWorkspaceMode('billing');
          } else if (tab === 'devices') {
            setWorkspaceMode('devices');
          } else if (tab === 'privacy') {
            setWorkspaceMode('privacy');
          }

          if (section === 'connect' || isDiscordGuildConnected) {
            setOwnerSection('connect');
          } else if (section === 'pricing') {
            setOwnerSection('pricing');
          }

          if (isIdentityLinkedRedirect) {
            setMemberSubTab('identity');
          }

          if (onboarding === 'owner') {
            setOnboardingInitialPath('owner');
            setIsOnboardingOpen(true);
          }

          if (isDiscordGuildConnected) {
            setStatusBanner({
              type: 'success',
              text: guildName
                ? `Discord server "${guildName}" linked to your community successfully!`
                : 'Discord server linked to your community successfully!'
            });
          } else if (oauthError) {
            setStatusBanner({ type: 'error', text: oauthError });
          } else if (accountUpdated === 'discord_linked') {
            setStatusBanner({ type: 'success', text: 'Your personal Discord account is now linked.' });
          } else if (connected === 'telegram') {
            setStatusBanner({ type: 'success', text: 'Your personal Telegram account is now linked.' });
          } else if (loginSuccess === 'true') {
            setStatusBanner({
              type: 'success',
              text: provider === 'telegram'
                ? 'Signed in cleanly with Telegram OpenID Connect.'
                : 'Signed in cleanly with Discord.'
            });
          }
        }, 0);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  const fetchData = React.useCallback(async (commId = currentCommunityId) => {
    setIsRefreshing(true);
    try {
      // Credentials: 'include' sends the HttpOnly, Secure SameSite=Lax cookie automatically
      const res = await fetch(`/api/data?communityId=${commId}`, {
        credentials: 'include'
      });
      const json = (await res.json()) as any;
      if (json.success && json.data) {
        const d = json.data;
        setCommunities(d.communities || []);
        const foundComm = d.communities?.find((c: Community) => c.id === commId) || d.currentCommunity || d.communities?.[0] || null;
        setCurrentCommunity(foundComm);
        if (foundComm && foundComm.id !== commId) {
          setCurrentCommunityId(foundComm.id);
        }
        setUsers(d.users || []);
        setRequests(d.requests || []);
        setOffers(d.offers || []);
        setTasks(d.tasks || []);
        setHandoffs(d.handoffs || []);
        setIntents(d.intents || []);
        setPolls(d.polls || []);
        setCommitments(d.commitments || []);
        setContributions(d.contributions || []);
        setAttestations(d.attestations || []);
        setDisputes(d.disputes || []);
        setPortfolioItems(d.portfolioItems || []);
        setOutcomes(d.outcomes || []);
        setLinks(d.links || []);
        setKnowledge(d.knowledge || []);
        setSourceCards(d.sourceCards || []);
        setAgentKits(d.agentKits || []);
        setRecoveryCandidates(d.recoveryCandidates || []);
        setDiscordTests(d.discordTests || []);
        setMiniAppTests(d.miniAppTests || []);
        setOwnerActionItems(d.ownerActionItems || []);
        setIdentityChallenges(d.identityChallenges || []);
        setMemberships(d.memberships || []);
        setAnnouncements(d.announcements || []);
        setInviteCodes(d.inviteCodes || []);
        setModerationActions(d.moderationActions || []);
        setEvents(d.events || []);
        setAuditLogs(d.auditLogs || []);
        if (d.subscription) setSubscription(d.subscription);
        if (d.entitlements) setEntitlements(d.entitlements);
        if (d.dataMode) setDataMode(d.dataMode);
        if (d.analytics) setAnalytics(d.analytics);

        // Authenticated user resolution via server session cookie
        if (d.authUser) {
          const resolvedRole: UserRole = d.currentUserRole || 'member';
          setAuthUser(d.authUser);
          setCurrentUserRole(resolvedRole);
          if (!hasAppliedInitialRoleRef.current) {
            hasAppliedInitialRoleRef.current = true;
            const firstOwned = (d.communities || []).find((c: Community) => c.ownerId === d.authUser.id);
            const wantsOwner = explicitWorkspaceIntentRef.current === 'owner';

            if (
              (wantsOwner || (!explicitTabRef.current && d.authUser.platformRole === 'community_owner')) &&
              firstOwned &&
              !['platform_admin', 'community_owner', 'admin'].includes(resolvedRole)
            ) {
              setCurrentCommunityId(firstOwned.id);
              setCurrentUserRole('community_owner');
              setWorkspaceMode('owner');
            } else if (!explicitTabRef.current && !['platform_admin', 'community_owner', 'admin'].includes(resolvedRole)) {
              setWorkspaceMode('member');
            }
          }
        } else {
          try {
            const meRes = await fetch('/api/auth/me', { credentials: 'include' });
            const meJson = (await meRes.json()) as any;
            if (meJson.authenticated && meJson.user) {
              setAuthUser(meJson.user);
              setCurrentUserRole('member');
              if (!hasAppliedInitialRoleRef.current) {
                hasAppliedInitialRoleRef.current = true;
                if (!explicitTabRef.current) {
                  setWorkspaceMode('member');
                }
              }
            } else {
              setAuthUser(null);
              setCurrentUserRole('guest');
            }
          } catch {
            setAuthUser(null);
            setCurrentUserRole('guest');
          }
        }

        // Use real persisted notifications first; supplement with fallback derived alerts if empty
        const activeUserId = d.authUser?.id || d.users?.[0]?.id || 'usr_sarah';
        const persistedNotifs: NotificationItem[] = Array.isArray(d.notifications) ? d.notifications : [];
        if (persistedNotifs.length > 0) {
          setNotifications(persistedNotifs);
        } else {
          const fallbackNotifs: NotificationItem[] = [
            ...((d.requests || []).slice(0, 2).map((r: NeedSignalRequest): NotificationItem => ({
              id: `ntf_req_${r.id}`,
              userId: activeUserId,
              communityId: r.communityId || commId,
              title: `New NeedSignal Request: ${r.title}`,
              message: `Priority: ${r.priority}. Match category: ${r.category}`,
              type: 'request',
              linkUrl: '/requests',
              read: false,
              channelAttempts: { inApp: true, discord: false, telegram: false },
              createdAt: r.createdAt
            }))),
            ...((d.contributions || []).filter((c: Contribution) => c.reviewStatus === 'verified').slice(0, 2).map((c: Contribution): NotificationItem => ({
              id: `ntf_cnt_${c.id}`,
              userId: activeUserId,
              communityId: c.communityId || commId,
              title: `Outcome Verified: ${c.title}`,
              message: `Verified and minted to the Trust Ledger`,
              type: 'review',
              linkUrl: '/trust',
              read: true,
              channelAttempts: { inApp: true, discord: false, telegram: false },
              createdAt: c.createdAt || c.submissionDate
            })))
          ];
          setNotifications(fallbackNotifs);
        }
      }
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err?.message || 'Failed to load Community OS state.' });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentCommunityId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(currentCommunityId);
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData, currentCommunityId]);

  const handleSelectCommunity = (id: string) => {
    setCurrentCommunityId(id);
    const targetComm = communities.find((c) => c.id === id);
    if (targetComm && authUser) {
      const isOwner = targetComm.ownerId === authUser.id || authUser.platformRole === 'platform_admin';
      const newRole = isOwner ? 'community_owner' : 'member';
      setCurrentUserRole(newRole);
      // Auto-switch away from Owner Workspace if user is not an owner in this community
      if (!isOwner && workspaceMode === 'owner') {
        setWorkspaceMode('member');
      }
    }
  };

  const handleToggleLang = () => {
    setLang((prev) => (prev === 'en' ? 'ar' : 'en'));
  };

  const handleToggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  const handleToggleDataMode = async () => {
    const nextMode: DataMode = dataMode === 'demo' ? 'production' : 'demo';
    try {
      const res = nextMode === 'demo'
        ? await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ action: 'restore_demo_seed' })
          })
        : await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ action: 'set_data_mode', payload: { mode: 'production' } })
          });
      const json = (await res.json()) as any;
      if (!res.ok || !json.success) {
        setStatusBanner({ type: 'error', text: json.error || 'Failed to switch data mode.' });
        return;
      }
      setDataMode(nextMode);
      await fetchData(currentCommunityId);
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err?.message || 'Failed to switch data mode.' });
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      try {
        localStorage.removeItem('community_os_session_token');
      } catch {}
      setAuthUser(null);
      setCurrentUserRole('guest');
      hasAppliedInitialRoleRef.current = false;
      explicitTabRef.current = false;
      setWorkspaceMode('member');
      await fetchData(currentCommunityId);
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err?.message || 'Failed to sign out cleanly.' });
    }
  };

  const handleOnboardingSelect = async (
    role: 'owner' | 'member',
    details?: { communityName?: string; inviteCode?: string }
  ) => {
    if (role === 'owner') {
      setWorkspaceMode('owner');
      setCurrentUserRole('community_owner');
      if (details?.communityName && authUser) {
        try {
          const res = await fetch('/api/data', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
              action: 'create_community',
              payload: {
                name: details.communityName,
                description: `${details.communityName} community workspace.`,
                ownerId: authUser.id
              }
            })
          });
          const json = (await res.json()) as any;
          const created = json.result || json.community;
          if (!res.ok || !json.success) {
            setStatusBanner({ type: 'error', text: json.error || 'Failed to create initial community.' });
          } else if (created) {
            handleCommunityCreated(created);
            setStatusBanner({ type: 'success', text: `Community "${created.name}" created! You are the Community Owner.` });
            return;
          }
        } catch (e: any) {
          setStatusBanner({ type: 'error', text: e?.message || 'Failed to create community during onboarding.' });
        }
      }
    } else {
      setWorkspaceMode('member');
      setCurrentUserRole('member');
      if (details?.inviteCode && authUser) {
        try {
          const res = await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              action: 'redeem_invite_code',
              payload: { code: details.inviteCode, userId: authUser.id }
            })
          });
          const json = (await res.json()) as any;
          if (!res.ok || !json.success) {
            setStatusBanner({ type: 'error', text: json.error || 'Could not redeem invite code.' });
          } else {
            const joinedComm = json.result?.community;
            if (joinedComm) setCurrentCommunityId(joinedComm.id);
            setStatusBanner({
              type: 'success',
              text: `Joined ${joinedComm?.name || 'community'} cleanly!`
            });
          }
        } catch (e: any) {
          setStatusBanner({ type: 'error', text: e?.message || 'Failed to redeem invite code.' });
        }
      }
    }
    await fetchData(currentCommunityId);
  };

  const handleCommunityCreated = (newComm: Community) => {
    setCommunities((prev) => [newComm, ...prev.filter((c) => c.id !== newComm.id)]);
    setCurrentCommunityId(newComm.id);
    setCurrentCommunity(newComm);
    setCurrentUserRole('community_owner');
    setWorkspaceMode('owner');
    fetchData(newComm.id);
  };

  const currentUser = authUser || users[0] || {
    id: 'usr_guest',
    name: 'Guest Visitor',
    email: 'guest@communityos.org',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
    bio: 'Community member exploring public outcomes.',
    platformRole: 'user' as const,
    createdAt: '2026-01-10T09:00:00Z',
    identities: {},
    passport: {
      displayName: 'Guest Visitor',
      biography: 'Exploring decentralized community outcomes.',
      skills: [],
      interests: [],
      languages: ['English'],
      collaborationPreferences: 'Open to learning and participating.',
      portfolioLinks: [],
      isPublic: true
    },
    privacy: {
      showBio: true,
      showSkills: true,
      showVerifiedOnly: false,
      allowDiscovery: true,
      allowCrossCommunitySharing: false,
      shareableRecordIds: []
    }
  };

  const t = translations[lang];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center">
        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
          <span>Loading Community OS State...</span>
        </div>
      </div>
    );
  }

  // 1. AUTHENTICATION MUST BE THE ENTRY POINT
  if (!authUser) {
    return (
      <AuthPortal
        lang={lang}
        onToggleLang={handleToggleLang}
        onAuthenticated={(user, defaultWorkspace, isNewSignup) => {
          setAuthUser(user);
          setWorkspaceMode(defaultWorkspace);
          const ownedByUser = communities.filter((c) => c.ownerId === user.id);
          const memberOf = memberships.filter((m) => m.userId === user.id);

          if (defaultWorkspace === 'owner' && ownedByUser.length > 0) {
            setCurrentCommunityId(ownedByUser[0].id);
            setCurrentUserRole('community_owner');
            setOnboardingInitialPath(undefined);
            setIsOnboardingOpen(Boolean(isNewSignup));
          } else if (isNewSignup || (defaultWorkspace === 'owner' && ownedByUser.length === 0) || (ownedByUser.length === 0 && memberOf.length === 0)) {
            setOnboardingInitialPath(defaultWorkspace);
            setIsOnboardingOpen(true);
          } else {
            setIsOnboardingOpen(false);
          }
          fetchData(ownedByUser[0]?.id && defaultWorkspace === 'owner' ? ownedByUser[0].id : currentCommunityId);
        }}
      />
    );
  }

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className={`min-h-screen ${darkMode ? 'dark bg-[#090d16] text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans transition-colors`}
    >
      {/* Top Header with Dual Workspace Selector & Zero-Fabrication Switch */}
      <Header
        lang={lang}
        onToggleLang={handleToggleLang}
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}
        communities={communities}
        currentCommunityId={currentCommunityId}
        onSelectCommunity={handleSelectCommunity}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenCreateRequest={() => { setWorkspaceMode('modules'); setActiveTab('requests'); }}
        onRefresh={() => fetchData(currentCommunityId)}
        isRefreshing={isRefreshing}
        workspaceMode={workspaceMode}
        onSelectWorkspaceMode={setWorkspaceMode}
        onSelectOwnerSection={(sec) => setOwnerSection(sec)}
        authUser={authUser}
        currentUserRole={currentUserRole}
        onSignOut={handleSignOut}
        onOpenCreateCommunity={() => setIsCreateCommunityOpen(true)}
        onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
        dataMode={dataMode}
        onToggleDataMode={handleToggleDataMode}
      />

      {/* Main Content Viewport (Adapts to Desktop / Auto / Mobile Preview) */}
      <main
        className={`min-h-[calc(100vh-140px)] ${
          deviceMode === 'mobile'
            ? 'max-w-md mx-auto border-x border-slate-800/80 shadow-2xl pb-24'
            : deviceMode === 'desktop'
            ? 'min-w-[960px] pb-8'
            : 'pb-20 md:pb-8'
        }`}
      >
        {statusBanner && (
          <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
            <div
              className={`rounded-xl border p-3.5 text-xs flex items-center justify-between gap-3 ${
                statusBanner.type === 'success'
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                  : statusBanner.type === 'error'
                  ? 'border-rose-500/40 bg-rose-950/40 text-rose-300'
                  : 'border-indigo-500/40 bg-indigo-950/40 text-indigo-300'
              }`}
            >
              <span>{statusBanner.text}</span>
              <button
                type="button"
                onClick={() => setStatusBanner(null)}
                className="text-slate-400 hover:text-white px-1"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex h-96 items-center justify-center">
            <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
              <span>Loading Community OS State...</span>
            </div>
          </div>
        ) : (
          <div>
            {/* WORKSPACE MODE 1: OWNER WORKSPACE */}
            {workspaceMode === 'owner' && !currentCommunity && (
              <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 space-y-4">
                  <h2 className="text-lg font-bold text-white">No Community Selected Yet</h2>
                  <p className="text-xs text-slate-400">
                    Create your first community workspace to connect Discord servers, Telegram groups, and manage deliverables.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCreateCommunityOpen(true)}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    + Create Your Community
                  </button>
                </div>
              </div>
            )}

            {workspaceMode === 'owner' && currentCommunity && (
              <OwnerWorkspace
                community={currentCommunity}
                currentUser={currentUser}
                currentUserRole={currentUserRole}
                users={users}
                memberships={memberships}
                requests={requests}
                offers={offers}
                tasks={tasks}
                contributions={contributions}
                disputes={disputes}
                knowledge={knowledge}
                links={links}
                events={events}
                announcements={announcements}
                inviteCodes={inviteCodes}
                auditLogs={auditLogs}
                moderationActions={moderationActions}
                ownerActionItems={ownerActionItems}
                dataMode={dataMode}
                lang={lang}
                subscription={subscription}
                entitlements={entitlements}
                onRefresh={() => fetchData(currentCommunityId)}
                onSelectTab={(tab) => {
                  setWorkspaceMode('modules');
                  setActiveTab(tab);
                }}
                onSwitchToMemberSpace={() => setWorkspaceMode('member')}
                onOpenPrivacy={() => setWorkspaceMode('privacy')}
                onOpenCreateCommunity={() => setIsCreateCommunityOpen(true)}
                initialSection={ownerSection}
              />
            )}

            {/* WORKSPACE MODE 2: MEMBER WORKSPACE */}
            {workspaceMode === 'member' && (
              <MemberWorkspace
                currentUser={currentUser}
                users={users}
                communities={communities}
                ownedCommunities={communities.filter((c) => authUser && c.ownerId === authUser.id)}
                onSwitchToOwnedCommunity={(commId) => {
                  handleSelectCommunity(commId);
                  setOwnerSection('operations');
                  setWorkspaceMode('owner');
                }}
                memberships={memberships}
                announcements={announcements}
                events={events}
                polls={polls}
                handoffs={handoffs}
                outcomes={outcomes}
                requests={requests}
                offers={offers}
                tasks={tasks}
                commitments={commitments}
                contributions={contributions}
                portfolioItems={portfolioItems}
                notifications={notifications}
                identityChallenges={identityChallenges}
                lang={lang}
                initialSubTab={memberSubTab}
                onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
                onRefresh={() => fetchData(currentCommunityId)}
                onSelectUser={() => {}}
                onSelectTab={(tab) => {
                  setWorkspaceMode('modules');
                  setActiveTab(tab);
                }}
              />
            )}

            {/* WORKSPACE MODE 3: ALL MODULES & SPECIFIC VIEWS */}
            {workspaceMode === 'modules' && (
              <div>
                {/* Community Hero Header */}
                {currentCommunity && (
                  <CommunityHero
                    community={currentCommunity}
                    analytics={analytics}
                    lang={lang}
                    onOpenCreateRequest={() => setActiveTab('requests')}
                    onSelectTab={setActiveTab}
                  />
                )}

                {/* Organized 3-Group Feature Directory */}
                <div className="border-b border-slate-800/80 bg-slate-950/60">
                  <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-300">
                        {lang === 'ar'
                          ? 'خريطة الميزات المنظمة — جميع أقسام التنسيق والتوثيق والربط'
                          : 'Organized Feature Directory — Collaboration, Trust & Ops'}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {lang === 'ar' ? 'اختر القسم للعمل المباشر' : 'Select any module to open'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      {[
                        {
                          groupTitle: lang === 'ar' ? '1. التعاون والطلبات' : '1. Collaboration',
                          items: [
                            { id: 'hub', label: t.navigation.hub, icon: Compass },
                            { id: 'requests', label: t.navigation.requests, icon: MessageSquare },
                            { id: 'tasks', label: t.navigation.tasks, icon: ListChecks }
                          ]
                        },
                        {
                          groupTitle: lang === 'ar' ? '2. الثقة والنمو' : '2. Trust & Growth',
                          items: [
                            { id: 'trust', label: t.navigation.contributions, icon: Shield },
                            { id: 'passport', label: t.navigation.passport, icon: Award },
                            { id: 'links', label: t.navigation.links, icon: Link2 },
                            { id: 'knowledge', label: t.navigation.knowledge, icon: BookOpen }
                          ]
                        },
                        {
                          groupTitle: lang === 'ar' ? '3. البوتات والفحص' : '3. Ops & QA',
                          items: [
                            { id: 'analytics', label: t.navigation.analytics, icon: BarChart3 },
                            { id: 'integrations', label: t.navigation.integrations, icon: Bot },
                            { id: 'tests', label: t.navigation.testSuite, icon: FlaskConical }
                          ]
                        }
                      ].map((group) => (
                        <div
                          key={group.groupTitle}
                          className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-2.5 space-y-2"
                        >
                          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 px-1">
                            {group.groupTitle}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {group.items.map((item) => {
                              const Icon = item.icon;
                              const isActive = activeTab === item.id;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => setActiveTab(item.id)}
                                  className={`min-h-[36px] flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                                    isActive
                                      ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/40 font-semibold'
                                      : 'bg-slate-950/60 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
                                  }`}
                                >
                                  <Icon className="h-3.5 w-3.5 shrink-0" />
                                  <span>{item.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Viewport Sections */}
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
                  {/* Tab: Hub Overview */}
                  {activeTab === 'hub' && (
                    <div className="space-y-8">
                      {/* Action Network Hub Banner */}
                      <div className="rounded-2xl border border-indigo-900/40 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-slate-900/40 p-6 md:p-8">
                        <div className="max-w-3xl space-y-3">
                          <div className="flex items-center gap-2 text-xs font-mono text-indigo-400">
                            <ShieldCheck className="h-4 w-4" />
                            <span>Universal Community Link System · Multi-Platform Gateway</span>
                          </div>
                          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                            {t.appTagline}
                          </h2>
                          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                            Operating seamlessly across Discord servers, Telegram groups, and the web platform. Turn unstructured conversations into verified deliverables, mutual attestations, and portable contributor records.
                          </p>
                          <div className="pt-2 flex flex-wrap gap-3">
                            <button
                              onClick={() => setActiveTab('requests')}
                              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span>{t.needSignal.newRequest}</span>
                            </button>
                            <button
                              onClick={() => setActiveTab('tests')}
                              className="flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-950/20 px-4 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-900/40 transition-colors"
                            >
                              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                              <span>Run E2E User Journeys (A–L)</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* 2-Column Split: Active NeedSignals & Recent Verified Outcomes */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Active Requests */}
                        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-indigo-400" />
                              <span>Active NeedSignal Requests</span>
                            </h3>
                            <button
                              onClick={() => setActiveTab('requests')}
                              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                            >
                              <span>View All</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>

                          {requests.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500 font-mono">
                              No active help requests in this community.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {requests.slice(0, 3).map((r) => (
                                <div
                                  key={r.id}
                                  onClick={() => setActiveTab('requests')}
                                  className="cursor-pointer rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 hover:border-slate-700 transition-colors"
                                >
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-white line-clamp-1">{r.title}</span>
                                    <span className="font-mono text-[11px] capitalize text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded">
                                      {r.priority}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                                    {r.description}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Verified Outcomes */}
                        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                              <span>Recent Verified Outcomes (SourceTrail)</span>
                            </h3>
                            <button
                              onClick={() => setActiveTab('trust')}
                              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                            >
                              <span>Contribution Ledger</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>

                          {contributions.filter((c) => c.reviewStatus === 'verified').length === 0 ? (
                            <div className="rounded-lg border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500 font-mono">
                              Zero verified outcomes yet. Complete a task with evidence to mint the first record.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {contributions.filter((c) => c.reviewStatus === 'verified').slice(0, 3).map((c) => (
                                <div
                                  key={c.id}
                                  onClick={() => setActiveTab('trust')}
                                  className="cursor-pointer rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 hover:border-slate-700 transition-colors"
                                >
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-white line-clamp-1">{c.title}</span>
                                    <span className="font-mono text-[11px] text-emerald-400">
                                      Verified by {c.reviewerId}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                                    {c.description}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab: NeedSignal & Match & Offer */}
                  {activeTab === 'requests' && currentCommunity && (
                    <NeedSignalSection
                      requests={requests}
                      offers={offers}
                      community={currentCommunity}
                      currentUser={currentUser}
                      lang={lang}
                      onRefresh={() => fetchData(currentCommunityId)}
                      onRequestCreated={() => fetchData(currentCommunityId)}
                    />
                  )}

                  {/* Tab: QuestLoop Tasks, MoveSure Handoffs, IntentReady */}
                  {activeTab === 'tasks' && currentCommunity && (
                    <QuestLoopSection
                      tasks={tasks}
                      handoffs={handoffs}
                      intents={intents}
                      community={currentCommunity}
                      currentUser={currentUser}
                      users={users}
                      lang={lang}
                      onRefresh={() => fetchData(currentCommunityId)}
                    />
                  )}

                  {/* Tab: TrustGraph, Contribution Ledger, Community Shield */}
                  {activeTab === 'trust' && currentCommunity && (
                    <TrustGraphSection
                      contributions={contributions}
                      attestations={attestations}
                      disputes={disputes}
                      community={currentCommunity}
                      currentUser={currentUser}
                      users={users}
                      lang={lang}
                      onRefresh={() => fetchData(currentCommunityId)}
                    />
                  )}

                  {/* Tab: Member Passport, Portfolio & Privacy */}
                  {activeTab === 'passport' && (
                    <PassportPortfolioSection
                      currentUser={currentUser}
                      portfolioItems={portfolioItems}
                      contributions={contributions}
                      outcomes={outcomes}
                      lang={lang}
                      onRefresh={() => fetchData(currentCommunityId)}
                    />
                  )}

                  {/* Tab: Community Links Manager */}
                  {activeTab === 'links' && currentCommunity && (
                    <LinkManagerSection
                      links={links}
                      community={currentCommunity}
                      currentUser={currentUser}
                      lang={lang}
                      onRefresh={() => fetchData(currentCommunityId)}
                    />
                  )}

                  {/* Tab: Knowledge & SourceTrail */}
                  {activeTab === 'knowledge' && currentCommunity && (
                    <KnowledgeSection
                      knowledge={knowledge}
                      sourceCards={sourceCards}
                      community={currentCommunity}
                      currentUser={currentUser}
                      lang={lang}
                      onRefresh={() => fetchData(currentCommunityId)}
                    />
                  )}

                  {/* Tab: Owner Analytics & Recovery & Agent Kits */}
                  {activeTab === 'analytics' && currentCommunity && (
                    <OwnerAnalyticsSection
                      analytics={analytics}
                      recoveryCandidates={recoveryCandidates}
                      agentKits={agentKits}
                      community={currentCommunity}
                      currentUser={currentUser}
                      lang={lang}
                      onRefresh={() => fetchData(currentCommunityId)}
                    />
                  )}

                  {/* Tab: Integrations Center */}
                  {activeTab === 'integrations' && currentCommunity && (
                    <IntegrationsSection
                      discordTests={discordTests}
                      miniAppTests={miniAppTests}
                      community={currentCommunity}
                      currentUser={currentUser}
                      currentUserRole={currentUserRole}
                      lang={lang}
                      onRefresh={() => fetchData(currentCommunityId)}
                    />
                  )}

                  {activeTab !== 'hub' && activeTab !== 'passport' && activeTab !== 'tests' && !currentCommunity && (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center space-y-3">
                      <p className="text-xs text-slate-400">Create a community first to manage this module.</p>
                      <button
                        type="button"
                        onClick={() => setIsCreateCommunityOpen(true)}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                      >
                        + Create Community
                      </button>
                    </div>
                  )}

                  {/* Tab: End-to-End User Journeys Testing Suite */}
                  {activeTab === 'tests' && (
                    <TestingSuiteSection lang={lang} />
                  )}
                </div>
              </div>
            )}

            {/* WORKSPACE MODE 4: BILLING, PRICING TIMING & QUOTA */}
            {workspaceMode === 'billing' && (
              <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
                <PricingPlansSection
                  community={
                    currentCommunity ||
                    communities[0] || {
                      id: 'comm_preview',
                      name: lang === 'ar' ? 'معاينة خطط المنصة' : 'Platform Billing Overview',
                      slug: 'preview',
                      description: 'Free for members forever; owners upgrade at scale.',
                      ownerId: currentUser.id,
                      themeColor: '#6366f1',
                      categories: ['Development'],
                      privacyPolicy: 'Consent-first ledger',
                      createdAt: new Date().toISOString()
                    }
                  }
                  subscription={subscription}
                  entitlements={entitlements}
                  isOwner={
                    ['platform_admin', 'community_owner', 'admin'].includes(currentUserRole) ||
                    Boolean(currentCommunity && authUser && currentCommunity.ownerId === authUser.id)
                  }
                  lang={lang}
                  onRefresh={() => fetchData(currentCommunityId)}
                  onOpenCreateCommunity={() => setIsCreateCommunityOpen(true)}
                  onOpenPrivacy={() => setWorkspaceMode('privacy')}
                />
              </div>
            )}

            {/* WORKSPACE MODE 5: PC / DESKTOP & MOBILE PHONE ACCESS HUB */}
            {workspaceMode === 'devices' && (
              <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
                <DeviceAccessCenter
                  currentUser={currentUser}
                  community={currentCommunity}
                  lang={lang}
                  deviceMode={deviceMode}
                  onChangeDeviceMode={setDeviceMode}
                  onNavigateWorkspace={(mode, subTab) => {
                    if (mode === 'modules' && subTab) {
                      setActiveTab(subTab);
                    } else if (mode === 'member' && subTab) {
                      setMemberSubTab(subTab as any);
                    }
                    setWorkspaceMode(mode);
                  }}
                  onRefresh={() => fetchData(currentCommunityId)}
                />
              </div>
            )}

            {/* WORKSPACE MODE 6: PRIVACY & GOVERNANCE POLICIES */}
            {workspaceMode === 'privacy' && (
              <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
                <PrivacyPoliciesSection
                  currentUser={authUser}
                  lang={lang}
                  onRefresh={() => fetchData(currentCommunityId)}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create Community Onboarding Modal */}
      <CreateCommunityModal
        isOpen={isCreateCommunityOpen}
        onClose={() => setIsCreateCommunityOpen(false)}
        onCreated={handleCommunityCreated}
        lang={lang}
      />

      {/* Account Settings & Identity Modal */}
      {authUser && (
        <AccountSettingsModal
          isOpen={isAccountSettingsOpen}
          onClose={() => setIsAccountSettingsOpen(false)}
          user={authUser}
          lang={lang}
          onSignOut={handleSignOut}
          onRefresh={() => fetchData(currentCommunityId)}
        />
      )}

      {/* Post-Registration & Onboarding Role Path Selection */}
      <OnboardingChoiceModal
        isOpen={isOnboardingOpen}
        user={authUser}
        lang={lang}
        initialPath={onboardingInitialPath}
        onSelectRole={handleOnboardingSelect}
        onClose={() => setIsOnboardingOpen(false)}
      />

      {/* Mobile Bottom Thumb Navigation Bar (Respects <=15% sticky height, min-h-[44px] targets) */}
      <nav
        aria-label={lang === 'ar' ? 'تنقل الهاتف السريع' : 'Mobile quick navigation'}
        className={`fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-slate-800 bg-[#090d16]/95 backdrop-blur-md px-2 ${
          deviceMode === 'mobile' ? 'block' : deviceMode === 'desktop' ? 'hidden' : 'lg:hidden'
        }`}
      >
        <div className="mx-auto grid h-full max-w-md grid-cols-5 items-center gap-1">
          {[
            {
              id: 'home',
              label: lang === 'ar' ? 'الرئيسية' : 'Home',
              icon: Shield,
              active: workspaceMode === 'owner' || workspaceMode === 'member',
              onClick: () =>
                setWorkspaceMode(
                  ['platform_admin', 'community_owner', 'admin'].includes(currentUserRole) ||
                    communities.some((c) => authUser && c.ownerId === authUser.id)
                    ? 'owner'
                    : 'member'
                )
            },
            {
              id: 'modules',
              label: lang === 'ar' ? 'الميزات' : 'Modules',
              icon: LayoutGrid,
              active: workspaceMode === 'modules',
              onClick: () => setWorkspaceMode('modules')
            },
            {
              id: 'devices',
              label: lang === 'ar' ? 'الأجهزة' : 'Devices',
              icon: MonitorSmartphone,
              active: workspaceMode === 'devices',
              onClick: () => setWorkspaceMode('devices')
            },
            {
              id: 'billing',
              label: lang === 'ar' ? 'الدفع' : 'Billing',
              icon: CreditCard,
              active: workspaceMode === 'billing',
              onClick: () => setWorkspaceMode('billing')
            },
            {
              id: 'privacy',
              label: lang === 'ar' ? 'الخصوصية' : 'Privacy',
              icon: Lock,
              active: workspaceMode === 'privacy',
              onClick: () => setWorkspaceMode('privacy')
            }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-semibold transition-colors ${
                  item.active
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate max-w-full">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Quiet, Anti-Slop Footer */}
      <footer
        className={`border-t border-slate-800 bg-[#090d16] pt-6 text-xs text-slate-500 ${
          deviceMode === 'mobile' ? 'pb-24' : deviceMode === 'desktop' ? 'pb-6' : 'pb-24 lg:pb-6'
        }`}
      >
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Community OS</span>
            <span>·</span>
            <span>Outcome Operating System for Discord, Telegram &amp; Web</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400">
            <button
              type="button"
              onClick={() => setWorkspaceMode('billing')}
              className="hover:text-amber-300 transition-colors"
            >
              {lang === 'ar' ? 'الخطط والدفع' : 'Plans & Billing'}
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setWorkspaceMode('devices')}
              className="hover:text-sky-300 transition-colors"
            >
              {lang === 'ar' ? 'الكمبيوتر والهاتف' : 'PC & Mobile'}
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setWorkspaceMode('privacy')}
              className="hover:text-emerald-300 transition-colors"
            >
              {lang === 'ar' ? 'الخصوصية والسياسات' : 'Privacy & Policies'}
            </button>
            <span>·</span>
            <Link href="/privacy" className="font-mono hover:text-emerald-300 transition-colors">
              /privacy
            </Link>
            <span>·</span>
            <span className="font-mono">2026 Community OS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
