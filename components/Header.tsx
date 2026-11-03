'use client';

import React, { useState } from 'react';
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
  Lock,
  ChevronDown,
  Settings
} from 'lucide-react';

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
  workspaceMode: 'owner' | 'member' | 'modules';
  onSelectWorkspaceMode: (mode: 'owner' | 'member' | 'modules') => void;
  // Real authenticated user
  authUser: User | null;
  currentUserRole: UserRole;
  onSignOut: () => void;
  onOpenCreateCommunity: () => void;
  onOpenAccountSettings?: () => void;
  // Data mode
  dataMode: DataMode;
  onToggleDataMode: () => void;
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
  authUser,
  currentUserRole,
  onSignOut,
  onOpenCreateCommunity,
  onOpenAccountSettings,
  dataMode,
  onToggleDataMode
}) => {
  const t = translations[lang];
  const [showRoleDeniedTip, setShowRoleDeniedTip] = useState(false);

  const isOwnerOrAdmin = ['platform_admin', 'community_owner', 'admin'].includes(currentUserRole);

  const handleOwnerWorkspaceClick = () => {
    if (isOwnerOrAdmin) {
      onSelectWorkspaceMode('owner');
    } else {
      setShowRoleDeniedTip(true);
      setTimeout(() => setShowRoleDeniedTip(false), 4000);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#090d16]/95 backdrop-blur-md">
      {/* Top Bar: Workspace Switcher & Auth Status Strip */}
      <div className="border-b border-slate-800/80 bg-slate-950/80 px-4 py-1.5 text-xs text-slate-400">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          {/* Workspace Mode Switcher with Real Role Check */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar relative">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider hidden sm:inline">Workspace:</span>

            {/* Owner Workspace Button (Enforces Role) */}
            <div className="relative">
              <button
                onClick={handleOwnerWorkspaceClick}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  workspaceMode === 'owner'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : isOwnerOrAdmin
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    : 'text-slate-500 cursor-not-allowed hover:bg-slate-900/60'
                }`}
              >
                {isOwnerOrAdmin ? (
                  <Shield className="h-3.5 w-3.5 text-amber-400" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-slate-500" />
                )}
                <span>👑 Owner Workspace</span>
              </button>

              {/* Permission Denied Tooltip */}
              {showRoleDeniedTip && (
                <div className="absolute left-0 top-full mt-1.5 z-50 w-64 rounded-lg border border-amber-800/80 bg-amber-950/95 p-2.5 text-[11px] text-amber-200 shadow-xl backdrop-blur-md">
                  <div className="font-bold flex items-center gap-1 mb-1 text-amber-300">
                    <Lock className="h-3.5 w-3.5" />
                    <span>Owner Access Restricted</span>
                  </div>
                  <p>
                    Your role in this community is <span className="font-mono uppercase font-bold text-white">{currentUserRole}</span>. Only community owners and admins can access the Owner Workspace.
                  </p>
                </div>
              )}
            </div>

            {/* Member Workspace Button */}
            <button
              onClick={() => onSelectWorkspaceMode('member')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                workspaceMode === 'member'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5 text-indigo-400" />
              <span>👤 Member Space</span>
            </button>

            {/* All Modules Hub */}
            <button
              onClick={() => onSelectWorkspaceMode('modules')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                workspaceMode === 'modules'
                  ? 'bg-slate-700/50 text-slate-200 border border-slate-600'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-slate-400" />
              <span>⚡ All Modules</span>
            </button>
          </div>

          {/* Right Strip: Data Mode & Real User Identity */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Zero-Fabrication Mode Badge / Switch */}
            <button
              onClick={onToggleDataMode}
              title="Click to toggle between Demo Fixtures and Zero-Data Clean Production"
              className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-mono border transition-colors ${
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

            {/* Authenticated Account or Sign In */}
            {authUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenAccountSettings}
                  title="Account & Identity Settings"
                  className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 rounded-md px-2 py-0.5 transition-colors cursor-pointer"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="font-medium text-slate-200 max-w-[120px] truncate">{authUser.name}</span>
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

        {/* Zone 2: Primary Nav Links */}
        <nav className="hidden lg:flex items-center gap-4 text-xs font-medium text-slate-400">
          <button
            onClick={() => { onSelectWorkspaceMode('modules'); onSelectTab('hub'); }}
            className={`whitespace-nowrap transition-colors py-1 ${activeTab === 'hub' && workspaceMode === 'modules' ? 'text-indigo-400 border-b border-indigo-500' : 'hover:text-slate-200'}`}
          >
            {t.navigation.hub}
          </button>
          <button
            onClick={() => { onSelectWorkspaceMode('modules'); onSelectTab('requests'); }}
            className={`whitespace-nowrap transition-colors py-1 ${activeTab === 'requests' && workspaceMode === 'modules' ? 'text-indigo-400 border-b border-indigo-500' : 'hover:text-slate-200'}`}
          >
            {t.navigation.requests}
          </button>
          <button
            onClick={() => { onSelectWorkspaceMode('modules'); onSelectTab('tasks'); }}
            className={`whitespace-nowrap transition-colors py-1 ${activeTab === 'tasks' && workspaceMode === 'modules' ? 'text-indigo-400 border-b border-indigo-500' : 'hover:text-slate-200'}`}
          >
            {t.navigation.tasks}
          </button>
          <button
            onClick={() => { onSelectWorkspaceMode('modules'); onSelectTab('trust'); }}
            className={`whitespace-nowrap transition-colors py-1 ${activeTab === 'trust' && workspaceMode === 'modules' ? 'text-indigo-400 border-b border-indigo-500' : 'hover:text-slate-200'}`}
          >
            {t.navigation.contributions}
          </button>
          <button
            onClick={() => { onSelectWorkspaceMode('modules'); onSelectTab('passport'); }}
            className={`whitespace-nowrap transition-colors py-1 ${activeTab === 'passport' && workspaceMode === 'modules' ? 'text-indigo-400 border-b border-indigo-500' : 'hover:text-slate-200'}`}
          >
            {t.navigation.passport}
          </button>
          <button
            onClick={() => { onSelectWorkspaceMode('modules'); onSelectTab('links'); }}
            className={`whitespace-nowrap transition-colors py-1 ${activeTab === 'links' && workspaceMode === 'modules' ? 'text-indigo-400 border-b border-indigo-500' : 'hover:text-slate-200'}`}
          >
            {t.navigation.links}
          </button>
          <button
            onClick={() => { onSelectWorkspaceMode('modules'); onSelectTab('analytics'); }}
            className={`whitespace-nowrap transition-colors py-1 ${activeTab === 'analytics' && workspaceMode === 'modules' ? 'text-indigo-400 border-b border-indigo-500' : 'hover:text-slate-200'}`}
          >
            {t.navigation.analytics}
          </button>
          <button
            onClick={() => { onSelectWorkspaceMode('modules'); onSelectTab('integrations'); }}
            className={`whitespace-nowrap transition-colors py-1 ${activeTab === 'integrations' && workspaceMode === 'modules' ? 'text-indigo-400 border-b border-indigo-500' : 'hover:text-slate-200'}`}
          >
            {t.navigation.integrations}
          </button>
          <button
            onClick={() => { onSelectWorkspaceMode('modules'); onSelectTab('tests'); }}
            className={`whitespace-nowrap transition-colors py-1 ${activeTab === 'tests' && workspaceMode === 'modules' ? 'text-amber-400 border-b border-amber-500' : 'hover:text-slate-200'}`}
          >
            {t.navigation.testSuite}
          </button>
        </nav>

        {/* Zone 3: Community Selector, Create Community, Lang Toggle, Refresh & Primary CTA */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Community Switcher */}
          <select
            value={currentCommunityId}
            onChange={(e) => onSelectCommunity(e.target.value)}
            className="h-8 rounded-md border border-slate-700 bg-slate-900/90 px-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500 max-w-[150px] truncate"
          >
            {communities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
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

      {/* Mobile Nav Scroller */}
      <div className="flex lg:hidden overflow-x-auto gap-2 px-4 py-2 border-t border-slate-800/80 text-xs font-medium text-slate-400 no-scrollbar">
        {['hub', 'requests', 'tasks', 'trust', 'passport', 'links', 'knowledge', 'analytics', 'integrations', 'tests'].map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => { onSelectWorkspaceMode('modules'); onSelectTab(tabKey); }}
            className={`whitespace-nowrap px-2.5 py-1 rounded transition-colors ${activeTab === tabKey && workspaceMode === 'modules' ? 'bg-indigo-600/20 text-indigo-400 font-semibold' : 'hover:text-slate-200'}`}
          >
            {t.navigation[tabKey as keyof typeof t.navigation] || tabKey}
          </button>
        ))}
      </div>
    </header>
  );
};
