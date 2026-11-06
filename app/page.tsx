'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
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
  PlanEntitlements
} from '@/lib/types';
import { CommunityOutcomeAnalytics } from '@/lib/services/analytics';
import { ArrowRight, ShieldCheck, CheckCircle2, MessageSquare, ListTodo, ExternalLink, Shield, UserCheck, Sparkles } from 'lucide-react';

export default function HomePage() {
  const [lang, setLang] = useState<Language>('en');
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('hub');
  const [workspaceMode, setWorkspaceMode] = useState<'owner' | 'member' | 'modules'>('owner');
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
  const [discordInstallUrl, setDiscordInstallUrl] = useState<string | null>(null);

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

  // Clean up any legacy localStorage tokens on load and clean OAuth callback URL parameters
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('community_os_session_token');
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('session_token')) {
        urlParams.delete('session_token');
        const cleanUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : '');
        window.history.replaceState({}, document.title, cleanUrl);
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
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        setCommunities(d.communities || []);
        const foundComm = d.communities?.find((c: Community) => c.id === commId) || d.currentCommunity || d.communities?.[0] || null;
        setCurrentCommunity(foundComm);
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
        if (d.subscription) setSubscription(d.subscription);
        if (d.entitlements) setEntitlements(d.entitlements);
        if (d.dataMode) setDataMode(d.dataMode);
        if (d.analytics) setAnalytics(d.analytics);

        // Authenticated user resolution via server session cookie
        if (d.authUser) {
          setAuthUser(d.authUser);
          setCurrentUserRole(d.currentUserRole || 'member');
        } else {
          try {
            const meRes = await fetch('/api/auth/me', { credentials: 'include' });
            const meJson = await meRes.json();
            if (meJson.authenticated && meJson.user) {
              setAuthUser(meJson.user);
              setCurrentUserRole('member');
            } else {
              setAuthUser(null);
              setCurrentUserRole('guest');
            }
          } catch {
            setAuthUser(null);
            setCurrentUserRole('guest');
          }
        }

        // Derive notifications
        const activeUserId = d.authUser?.id || d.users?.[0]?.id || 'usr_sarah';
        const notifs: NotificationItem[] = [
          ...((d.requests || []).slice(0, 2).map((r: NeedSignalRequest) => ({
            id: `ntf_req_${r.id}`,
            userId: activeUserId,
            title: `New NeedSignal Request: ${r.title}`,
            message: `Priority: ${r.priority}. Match category: ${r.category}`,
            type: 'request' as const,
            actionUrl: '/requests',
            isRead: false,
            createdAt: r.createdAt
          }))),
          ...((d.contributions || []).filter((c: Contribution) => c.reviewStatus === 'verified').slice(0, 2).map((c: Contribution) => ({
            id: `ntf_cnt_${c.id}`,
            userId: activeUserId,
            title: `Outcome Verified: ${c.title}`,
            message: `Verified and minted to the Trust Ledger`,
            type: 'attestation' as const,
            actionUrl: '/trust',
            isRead: true,
            createdAt: c.createdAt || c.submissionDate
          })))
        ];
        setNotifications(notifs);
      }
    } catch (err) {
      console.error('Failed to load Community OS data:', err);
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
      if (nextMode === 'demo') {
        await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'restore_demo_seed' })
        });
      } else {
        await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'set_data_mode', payload: { mode: 'production' } })
        });
      }
      setDataMode(nextMode);
      await fetchData(currentCommunityId);
    } catch (err) {
      console.error('Failed to toggle data mode:', err);
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
      setWorkspaceMode('member');
      await fetchData(currentCommunityId);
    } catch (err) {
      console.error('Failed to sign out:', err);
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
          const json = await res.json();
          if (json.success && json.community) {
            handleCommunityCreated(json.community);
          }
        } catch (e) {
          console.error('Failed to create community during onboarding:', e);
        }
      }
    } else {
      setWorkspaceMode('member');
      setCurrentUserRole('member');
    }
    await fetchData(currentCommunityId);
  };

  const handleCommunityCreated = (newComm: Community) => {
    setCommunities((prev) => [newComm, ...prev]);
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
        onAuthenticated={(user, defaultWorkspace) => {
          setAuthUser(user);
          setWorkspaceMode(defaultWorkspace);
          setIsOnboardingOpen(true);
          fetchData(currentCommunityId);
        }}
        discordInstallUrl={discordInstallUrl || undefined}
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
        authUser={authUser}
        currentUserRole={currentUserRole}
        onSignOut={handleSignOut}
        onOpenCreateCommunity={() => setIsCreateCommunityOpen(true)}
        onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
        dataMode={dataMode}
        onToggleDataMode={handleToggleDataMode}
      />

      {/* Main Content Viewport */}
      <main className="min-h-[calc(100vh-140px)]">
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
            {workspaceMode === 'owner' && currentCommunity && (
              <OwnerWorkspace
                community={currentCommunity}
                currentUser={currentUser}
                currentUserRole={currentUserRole}
                users={users}
                requests={requests}
                offers={offers}
                tasks={tasks}
                contributions={contributions}
                disputes={disputes}
                knowledge={knowledge}
                links={links}
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
              />
            )}

            {/* WORKSPACE MODE 2: MEMBER WORKSPACE */}
            {workspaceMode === 'member' && (
              <MemberWorkspace
                currentUser={currentUser}
                users={users}
                communities={communities}
                requests={requests}
                offers={offers}
                tasks={tasks}
                commitments={commitments}
                contributions={contributions}
                portfolioItems={portfolioItems}
                notifications={notifications}
                identityChallenges={identityChallenges}
                lang={lang}
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
                  {activeTab === 'requests' && (
                    <NeedSignalSection
                      requests={requests}
                      offers={offers}
                      community={currentCommunity!}
                      currentUser={currentUser}
                      lang={lang}
                      onRefresh={() => fetchData(currentCommunityId)}
                      onRequestCreated={() => fetchData(currentCommunityId)}
                    />
                  )}

                  {/* Tab: QuestLoop Tasks, MoveSure Handoffs, IntentReady */}
                  {activeTab === 'tasks' && (
                    <QuestLoopSection
                      tasks={tasks}
                      handoffs={handoffs}
                      intents={intents}
                      community={currentCommunity!}
                      currentUser={currentUser}
                      users={users}
                      lang={lang}
                      onRefresh={() => fetchData(currentCommunityId)}
                    />
                  )}

                  {/* Tab: TrustGraph, Contribution Ledger, Community Shield */}
                  {activeTab === 'trust' && (
                    <TrustGraphSection
                      contributions={contributions}
                      attestations={attestations}
                      disputes={disputes}
                      community={currentCommunity!}
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
                  {activeTab === 'links' && (
                    <LinkManagerSection
                      links={links}
                      community={currentCommunity!}
                      currentUser={currentUser}
                      lang={lang}
                      onRefresh={() => fetchData(currentCommunityId)}
                    />
                  )}

                  {/* Tab: Knowledge & SourceTrail */}
                  {activeTab === 'knowledge' && (
                    <KnowledgeSection
                      knowledge={knowledge}
                      sourceCards={sourceCards}
                      community={currentCommunity!}
                      currentUser={currentUser}
                      lang={lang}
                      onRefresh={() => fetchData(currentCommunityId)}
                    />
                  )}

                  {/* Tab: Owner Analytics & Recovery & Agent Kits */}
                  {activeTab === 'analytics' && (
                    <OwnerAnalyticsSection
                      analytics={analytics}
                      recoveryCandidates={recoveryCandidates}
                      agentKits={agentKits}
                      community={currentCommunity!}
                      currentUser={currentUser}
                      lang={lang}
                      onRefresh={() => fetchData(currentCommunityId)}
                    />
                  )}

                  {/* Tab: Integrations Center */}
                  {activeTab === 'integrations' && (
                    <IntegrationsSection
                      discordTests={discordTests}
                      miniAppTests={miniAppTests}
                      community={currentCommunity!}
                      currentUser={currentUser}
                      currentUserRole={currentUserRole}
                      lang={lang}
                      onRefresh={() => fetchData(currentCommunityId)}
                    />
                  )}

                  {/* Tab: End-to-End User Journeys Testing Suite */}
                  {activeTab === 'tests' && (
                    <TestingSuiteSection lang={lang} />
                  )}
                </div>
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
        onSelectRole={handleOnboardingSelect}
        onClose={() => setIsOnboardingOpen(false)}
      />

      {/* Quiet, Anti-Slop Footer */}
      <footer className="border-t border-slate-800 bg-[#090d16] py-6 text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Community OS</span>
            <span>·</span>
            <span>Outcome Operating System for Discord, Telegram & Web</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px] text-slate-400">
            <span>Multi-Tenant Isolation: Active</span>
            <span>·</span>
            <span>Silence != Consent Rule: Enforced</span>
            <span>·</span>
            <span>2026 Community OS Foundation</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
