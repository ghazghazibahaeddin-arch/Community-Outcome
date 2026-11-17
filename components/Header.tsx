'use client';

import React from 'react';
import Link from 'next/link';
import { translations } from '@/lib/i18n';
import { Community, Language, User, DataMode, UserRole } from '@/lib/types';
import {
  ShieldCheck,
  Globe,
  Moon,
  Sun,
  Plus,
  RefreshCw,
  UserCheck,
  Shield,
  Sparkles,
  Database,
  LogIn,
  LogOut,
  Building2,
  Settings,
  Bot,
  Send,
  CreditCard,
  MonitorSmartphone,
  Lock,
  LayoutGrid,
  Search
} from 'lucide-react';

export type WorkspaceMode = 'owner' | 'member' | 'modules' | 'billing' | 'devices' | 'privacy';

interface HeaderProps {
  lang: Language;
  onToggleLang: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  communities: Community[];
  currentCommunityId: string;
  onSelectCommunity: (id: string) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenCreateRequest: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  // Workspace integration
  workspaceMode: WorkspaceMode;
  onSelectWorkspaceMode: (mode: WorkspaceMode) => void;
  onSelectOwnerSection?: (section: 'operations' | 'connect' | 'pricing') => void;
  // Real authenticated user
  authUser: User | null;
  currentUserRole: UserRole;
  onSignOut: () => void;
  onOpenCreateCommunity: () => void;
  onOpenAccountSettings?: () => void;
  // Data mode
  dataMode: DataMode;
  onToggleDataMode: () => void;
  onOpenSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onToggleLang,
  darkMode,
  onToggleDarkMode,
  communities,
  currentCommunityId,
  onSelectCommunity,
  activeTab,
  onSelectTab,
  onOpenCreateRequest,
  onRefresh,
  isRefreshing = false,
  workspaceMode,
  onSelectWorkspaceMode,
  onSelectOwnerSection,
  authUser,
  currentUserRole,
  onSignOut,
  onOpenCreateCommunity,
  onOpenAccountSettings,
  dataMode,
  onToggleDataMode,
  onOpenSearch
}) => {
  const t = translations[lang];
  const isRtl = lang === 'ar';

  const isOwnerOrAdmin = ['platform_admin', 'community_owner', 'admin'].includes(currentUserRole);
  const ownedCommunities = authUser
    ? communities.filter((c) => c.ownerId === authUser.id)
    : [];
  const joinedCommunities = authUser
    ? communities.filter((c) => c.ownerId !== authUser.id)
    : communities;
  const hasAnyOwnedCommunity = ownedCommunities.length > 0;
  const canOpenOwnerWorkspace = isOwnerOrAdmin || hasAnyOwnedCommunity;

  const handleOwnerWorkspaceClick = (targetSection?: 'operations' | 'connect' | 'pricing') => {
    if (isOwnerOrAdmin) {
      if (targetSection) onSelectOwnerSection?.(targetSection);
      onSelectWorkspaceMode('owner');
      return;
    }
    if (ownedCommunities.length > 0) {
      onSelectCommunity(ownedCommunities[0].id);
      if (targetSection) onSelectOwnerSection?.(targetSection);
      onSelectWorkspaceMode('owner');
      return;
    }
    onOpenCreateCommunity();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#090d16]/95 backdrop-blur-md">
      {/* Top Bar: Workspace Switcher & Auth Status Strip */}
      <div className="border-b border-slate-800/80 bg-slate-950/80 px-4 py-1.5 text-xs text-slate-400">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          {/* Workspace Mode Switcher with Smart Multi-Community Role Switch */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar relative">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider hidden sm:inline">
              {isRtl ? 'المساحة:' : 'Workspace:'}
            </span>

            {/* Owner Workspace Button (Auto-switches to owned group or offers creation) */}
            <button
              type="button"
              onClick={() => handleOwnerWorkspaceClick('operations')}
              title={
                canOpenOwnerWorkspace
                  ? isRtl
                    ? 'إدارة مجموعتك أو خادمك'
                    : 'Manage your owned group or server'
                  : isRtl
                  ? 'إنشاء مجتمعك الخاص لتصبح مالكاً'
                  : 'Create your own group or server to become an owner'
              }
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                workspaceMode === 'owner'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : canOpenOwnerWorkspace
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  : 'text-amber-300/90 border border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/15'
              }`}
            >
              {canOpenOwnerWorkspace ? (
                <Shield className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Plus className="h-3.5 w-3.5 text-amber-400" />
              )}
              <span>
                {canOpenOwnerWorkspace
                  ? isRtl
                    ? 'مساحة صاحب الجروب'
                    : 'Owner Workspace'
                  : isRtl
                  ? '+ أنشئ مجموعتك'
                  : '+ Create Owner Group'}
              </span>
            </button>

            {/* Member Workspace Button */}
            <button
              type="button"
              onClick={() => onSelectWorkspaceMode('member')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                workspaceMode === 'member'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5 text-indigo-400" />
              <span>{isRtl ? 'مساحة العضو' : 'Member Space'}</span>
            </button>

            {/* All Modules Hub */}
            <button
              type="button"
              onClick={() => {
                onSelectWorkspaceMode('modules');
                if (!activeTab) onSelectTab('hub');
              }}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                workspaceMode === 'modules'
                  ? 'bg-slate-700/60 text-white border border-slate-500'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-slate-400" />
              <span>{isRtl ? 'كل الميزات' : 'All Modules'}</span>
            </button>
          </div>

          {/* Right Strip: Data Mode & Real User Identity */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Zero-Fabrication Mode Badge / Switch */}
            <button
              type="button"
              onClick={onToggleDataMode}
              title="Click to toggle between Demo Fixtures and Zero-Data Clean Production"
              className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-mono border transition-colors whitespace-nowrap shrink-0 ${
                dataMode === 'production'
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900/40'
                  : 'bg-amber-950/30 text-amber-300 border-amber-500/40 hover:bg-amber-900/40'
              }`}
            >
              <Database className="h-3 w-3" />
              <span className="hidden sm:inline">
                {dataMode === 'production' ? 'PROD (Zero-Fabrication)' : 'DEMO SANDBOX'}
              </span>
              <span className="sm:hidden font-bold">
                {dataMode === 'production' ? 'PROD' : 'DEMO'}
              </span>
            </button>

            {/* Authenticated Account, Direct Discord/Telegram Linking & Sign Out */}
            {authUser ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {authUser.identities?.discordId ? (
                  <button
                    type="button"
                    onClick={onOpenAccountSettings}
                    title={`Discord linked: @${authUser.identities.discordUsername || authUser.identities.discordId}`}
                    className="hidden md:flex items-center gap-1 rounded-md border border-[#5865F2]/40 bg-[#5865F2]/15 px-2 py-0.5 text-[11px] font-medium text-[#a5b2ff] hover:bg-[#5865F2]/25 transition-colors whitespace-nowrap"
                  >
                    <Bot className="h-3 w-3" />
                    <span className="max-w-[90px] truncate">@{authUser.identities.discordUsername || 'Discord'}</span>
                  </button>
                ) : (
                  <a
                    href={`/api/discord/connect?mode=user&redirect=true&intent=${workspaceMode === 'owner' ? 'owner' : 'member'}`}
                    title={isRtl ? 'إضافة وربط حساب Discord' : 'Add & Link your Discord account'}
                    className="flex items-center gap-1 rounded-md border border-[#5865F2]/50 bg-[#5865F2]/15 hover:bg-[#5865F2]/25 px-2 py-0.5 text-[11px] font-semibold text-[#9aa8ff] transition-colors whitespace-nowrap"
                  >
                    <Bot className="h-3 w-3" />
                    <span>{isRtl ? '+ ربط Discord' : '+ Discord'}</span>
                  </a>
                )}

                {authUser.identities?.telegramId ? (
                  <button
                    type="button"
                    onClick={onOpenAccountSettings}
                    title={`Telegram linked: @${authUser.identities.telegramUsername || authUser.identities.telegramId}`}
                    className="hidden md:flex items-center gap-1 rounded-md border border-[#229ED9]/40 bg-[#229ED9]/15 px-2 py-0.5 text-[11px] font-medium text-[#6ecdf9] hover:bg-[#229ED9]/25 transition-colors whitespace-nowrap"
                  >
                    <Send className="h-3 w-3" />
                    <span className="max-w-[90px] truncate">@{authUser.identities.telegramUsername || 'Telegram'}</span>
                  </button>
                ) : (
                  <a
                    href={`/api/auth/telegram/authorize?redirect=true&intent=${workspaceMode === 'owner' ? 'owner' : 'member'}`}
                    title={isRtl ? 'إضافة وربط حساب Telegram' : 'Add & Link your Telegram account'}
                    className="flex items-center gap-1 rounded-md border border-[#229ED9]/50 bg-[#229ED9]/15 hover:bg-[#229ED9]/25 px-2 py-0.5 text-[11px] font-semibold text-[#5dc5f7] transition-colors whitespace-nowrap"
                  >
                    <Send className="h-3 w-3" />
                    <span>{isRtl ? '+ ربط Telegram' : '+ Telegram'}</span>
                  </a>
                )}

                <button
                  onClick={onOpenAccountSettings}
                  title="Account & Linked Profiles Settings"
                  className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 rounded-md px-2 py-0.5 transition-colors cursor-pointer"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="font-medium text-slate-200 max-w-[110px] truncate">{authUser.name}</span>
                  <span className="text-[10px] font-mono uppercase bg-indigo-950/60 text-indigo-300 border border-indigo-700/50 px-1 rounded">
                    {currentUserRole}
                  </span>
                  <Settings className="h-3 w-3 text-slate-400 ml-0.5" />
                </button>
                <button
                  onClick={onSignOut}
                  title="Sign out of your account"
                  className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-rose-300 transition-colors"
                >
                  <LogOut className="h-3 w-3" />
                  <span className="hidden md:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <LogIn className="h-3 w-3" />
                  <span>Sign In</span>
                </Link>
                <span className="text-slate-600">|</span>
                <Link
                  href="/auth/signup"
                  className="text-[11px] font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Header Row */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white whitespace-nowrap block">
                {t.appName}
              </span>
              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline-block">
                Outcome OS
              </span>
            </div>
          </Link>
        </div>

        {/* Zone 2: Clean 5-Destination Navigation */}
        <nav className="hidden lg:flex items-center gap-2 text-xs font-medium text-slate-400">
          <button
            type="button"
            onClick={() => onSelectWorkspaceMode(canOpenOwnerWorkspace ? 'owner' : 'member')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 whitespace-nowrap shrink-0 transition-colors ${
              workspaceMode === 'owner' || workspaceMode === 'member'
                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-semibold'
                : 'hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>{isRtl ? 'مساحة العمل' : 'Workspace'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectWorkspaceMode('modules');
              onSelectTab(activeTab || 'hub');
            }}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 whitespace-nowrap shrink-0 transition-colors ${
              workspaceMode === 'modules'
                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-semibold'
                : 'hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>{isRtl ? 'الميزات والأقسام' : 'Features & Modules'}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectWorkspaceMode('billing')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 whitespace-nowrap shrink-0 transition-colors ${
              workspaceMode === 'billing'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                : 'text-amber-300/85 hover:text-amber-200 hover:bg-amber-500/10'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5 text-amber-400" />
            <span>{isRtl ? 'الدفع والخطط' : 'Plans & Billing'}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectWorkspaceMode('devices')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 whitespace-nowrap shrink-0 transition-colors ${
              workspaceMode === 'devices'
                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-semibold'
                : 'hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <MonitorSmartphone className="h-3.5 w-3.5 text-sky-400" />
            <span>{isRtl ? 'الكمبيوتر والهاتف' : 'PC & Mobile'}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectWorkspaceMode('privacy')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 whitespace-nowrap shrink-0 transition-colors ${
              workspaceMode === 'privacy'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold'
                : 'hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
            <span>{isRtl ? 'الخصوصية والسياسات' : 'Privacy & Policies'}</span>
          </button>
        </nav>

        {/* Zone 3: Community Selector, Create Community, Lang Toggle, Refresh & Primary CTA */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Grouped Community Switcher (Owned vs Joined) */}
          <select
            aria-label={isRtl ? 'تبديل المجتمع' : 'Switch community'}
            value={currentCommunityId}
            onChange={(e) => onSelectCommunity(e.target.value)}
            className="h-8 rounded-md border border-slate-700 bg-slate-900/90 px-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500 max-w-[175px] truncate"
          >
            {ownedCommunities.length > 0 && (
              <optgroup label={isRtl ? 'المجموعات والخوادم التي أملكها' : 'My Owned Groups & Servers'}>
                {ownedCommunities.map((c) => (
                  <option key={c.id} value={c.id}>
                    [Owner] {c.name}
                  </option>
                ))}
              </optgroup>
            )}
            {joinedCommunities.length > 0 && (
              <optgroup label={isRtl ? 'مجتمعات منضم إليها كعضو' : 'Joined Communities (Member)'}>
                {joinedCommunities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          {/* Create Community Button */}
          <button
            onClick={onOpenCreateCommunity}
            title="Create a new community and become its founding owner"
            className="flex h-8 items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
          >
            <Building2 className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden xl:inline">+ New Community</span>
          </button>

          {/* Quick Jump Search (Cmd/Ctrl + K) */}
          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              title={isRtl ? 'بحث وانتقال سريع (Ctrl+K)' : 'Quick Jump Search (⌘K / Ctrl+K)'}
              className="flex h-8 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2.5 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-600 transition-colors shrink-0"
            >
              <Search className="h-3.5 w-3.5 text-indigo-400" />
              <span className="hidden xl:inline">{isRtl ? 'بحث' : 'Search'}</span>
              <kbd className="hidden sm:inline rounded bg-slate-800 px-1 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-700">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Refresh Data */}
          <button
            onClick={onRefresh}
            title={t.common.refresh}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          {/* Language Switch */}
          <button
            onClick={onToggleLang}
            className="flex h-8 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="font-mono uppercase">{lang === 'en' ? 'AR' : 'EN'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleDarkMode}
            title={darkMode ? t.common.light : t.common.dark}
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-300 hover:text-white transition-colors"
          >
            {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>

          {/* Primary Action Button */}
          <button
            onClick={onOpenCreateRequest}
            className="flex h-8 items-center gap-1.5 rounded-md bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors whitespace-nowrap shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.needSignal.newRequest}</span>
            <span className="sm:hidden">{t.common.create}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
