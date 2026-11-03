'use client';

import React, { useState, useEffect } from 'react';
import { translations } from '@/lib/i18n';
import { Community, Language, User, UserRole, IntegrationCheckResult } from '@/lib/types';
import {
  Bot,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Send,
  Unlink,
  MessageSquare,
  Lock,
  Copy,
  Check,
  Pin,
  Sparkles,
  Layers,
  Terminal,
  Activity,
  AlertCircle
} from 'lucide-react';

interface CommunityConnectionCenterProps {
  community: Community;
  currentUser: User;
  currentUserRole?: UserRole;
  lang: Language;
  onRefresh: () => void;
}

export const CommunityConnectionCenter: React.FC<CommunityConnectionCenterProps> = ({
  community,
  currentUser,
  currentUserRole = 'community_owner',
  lang,
  onRefresh
}) => {
  const t = translations[lang];

  // Active Connection Tab: 'discord' | 'telegram' | 'menu'
  const [activeTab, setActiveTab] = useState<'discord' | 'telegram' | 'menu'>('discord');

  // Discord State
  const [isVerifyingDiscord, setIsVerifyingDiscord] = useState(false);
  const [discordInstallUrl, setDiscordInstallUrl] = useState<string | null>(null);
  const [discordGuildInput, setDiscordGuildInput] = useState(community.discordConfig?.serverId || '');
  const [discordGuildNameInput, setDiscordGuildNameInput] = useState(community.discordConfig?.serverName || '');
  const [discordChannelInput, setDiscordChannelInput] = useState(community.discordConfig?.channelId || '');
  const [discordStatusMsg, setDiscordStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [discordLiveCheck, setDiscordLiveCheck] = useState<IntegrationCheckResult | null>(null);

  // Telegram State
  const [isVerifyingTelegram, setIsVerifyingTelegram] = useState(false);
  const [telegramChallenge, setTelegramChallenge] = useState<{
    code: string;
    command: string;
    expiresAt: string;
    botUsername: string;
    botLink: string;
    instructions: string[];
  } | null>(null);
  const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [telegramStatusMsg, setTelegramStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [telegramLiveCheck, setTelegramLiveCheck] = useState<IntegrationCheckResult | null>(null);

  // Persistent In-Group Menu State
  const [publishingPlatform, setPublishingPlatform] = useState<'discord' | 'telegram'>('telegram');
  const [isPublishingMenu, setIsPublishingMenu] = useState(false);
  const [pinTelegramMenu, setPinTelegramMenu] = useState(true);
  const [publishResult, setPublishResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isOwnerOrAdmin = ['platform_admin', 'community_owner', 'admin'].includes(currentUserRole);

  // Load Discord install URL on mount
  useEffect(() => {
    const fetchDiscordInfo = async () => {
      try {
        const res = await fetch(`/api/discord/connect?communityId=${community.id}`);
        const data = await res.json();
        if (data.success && data.installUrl) {
          setDiscordInstallUrl(data.installUrl);
        }
      } catch {}
    };
    if (isOwnerOrAdmin) {
      fetchDiscordInfo();
    }
  }, [community.id, isOwnerOrAdmin]);

  // Handle Discord Live Verification
  const handleVerifyDiscord = async () => {
    setIsVerifyingDiscord(true);
    setDiscordStatusMsg(null);
    try {
      const res = await fetch('/api/integrations/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'discord' })
      });
      const data = await res.json();
      if (data.success && data.result) {
        setDiscordLiveCheck(data.result);
        if (data.result.status === 'connected') {
          setDiscordStatusMsg({
            type: 'success',
            text: `Discord Bot verified! ${data.result.botName} (@${data.result.botUsername}) is active with slash command capabilities.`
          });
        } else {
          setDiscordStatusMsg({
            type: 'info',
            text: data.result.details || 'Discord bot status checked.'
          });
        }
      }
    } catch (err: any) {
      setDiscordStatusMsg({ type: 'error', text: `Verification failed: ${err.message}` });
    } finally {
      setIsVerifyingDiscord(false);
    }
  };

  // Handle Discord Manual Guild Link
  const handleConnectDiscordGuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discordGuildInput.trim()) return;
    setDiscordStatusMsg(null);
    try {
      const res = await fetch('/api/discord/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId: community.id,
          serverId: discordGuildInput.trim(),
          serverName: discordGuildNameInput.trim() || undefined,
          channelId: discordChannelInput.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setDiscordStatusMsg({ type: 'error', text: data.error || 'Failed to connect Discord server' });
        return;
      }
      setDiscordStatusMsg({
        type: 'success',
        text: `Successfully linked Discord server "${data.server?.name || discordGuildInput}" to ${community.name}!`
      });
      onRefresh();
    } catch (err: any) {
      setDiscordStatusMsg({ type: 'error', text: `Connection error: ${err.message}` });
    }
  };

  // Handle Telegram Live Verification
  const handleVerifyTelegram = async () => {
    setIsVerifyingTelegram(true);
    setTelegramStatusMsg(null);
    try {
      const res = await fetch('/api/integrations/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'telegram' })
      });
      const data = await res.json();
      if (data.success && data.result) {
        setTelegramLiveCheck(data.result);
        if (data.result.status === 'connected') {
          setTelegramStatusMsg({
            type: 'success',
            text: `Telegram Bot verified! @${data.result.botUsername} (${data.result.botName}) is online with webhook active.`
          });
        } else {
          setTelegramStatusMsg({
            type: 'info',
            text: data.result.details || 'Telegram bot check completed.'
          });
        }
      }
    } catch (err: any) {
      setTelegramStatusMsg({ type: 'error', text: `Verification failed: ${err.message}` });
    } finally {
      setIsVerifyingTelegram(false);
    }
  };

  // Generate Telegram Group Challenge
  const handleGenerateTelegramChallenge = async () => {
    setIsGeneratingChallenge(true);
    setTelegramStatusMsg(null);
    try {
      const res = await fetch('/api/telegram/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityId: community.id })
      });
      const data = await res.json();
      if (data.success && data.challenge) {
        setTelegramChallenge(data.challenge);
      } else {
        setTelegramStatusMsg({ type: 'error', text: data.error || 'Failed to generate connection challenge' });
      }
    } catch (err: any) {
      setTelegramStatusMsg({ type: 'error', text: `Network error: ${err.message}` });
    } finally {
      setIsGeneratingChallenge(false);
    }
  };

  // Handle Disconnect
  const handleDisconnect = async (platform: 'discord' | 'telegram') => {
    if (!window.confirm(`Are you sure you want to disconnect ${platform.toUpperCase()} from ${community.name}?`)) return;
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'disconnect_platform',
          payload: {
            communityId: community.id,
            platform,
            actorId: currentUser.id
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        if (platform === 'discord') {
          setDiscordStatusMsg({ type: 'info', text: 'Discord server disconnected.' });
        } else {
          setTelegramStatusMsg({ type: 'info', text: 'Telegram group disconnected.' });
        }
        onRefresh();
      }
    } catch (err: any) {
      console.error('Failed to disconnect platform:', err);
    }
  };

  // Handle Publish In-Group Persistent Menu
  const handlePublishMenu = async () => {
    setIsPublishingMenu(true);
    setPublishResult(null);
    try {
      const endpoint = publishingPlatform === 'discord' ? '/api/discord/publish-menu' : '/api/telegram/publish-menu';
      const payload: any = { communityId: community.id };
      if (publishingPlatform === 'telegram') {
        payload.pinMessage = pinTelegramMenu;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setPublishResult({
          type: 'success',
          message: data.details || `Successfully published interactive menu to ${publishingPlatform}!`
        });
        onRefresh();
      } else {
        setPublishResult({
          type: 'error',
          message: data.error || `Failed to publish menu to ${publishingPlatform}`
        });
      }
    } catch (err: any) {
      setPublishResult({ type: 'error', message: `Publish error: ${err.message}` });
    } finally {
      setIsPublishingMenu(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const isDiscordConnected = community.discordConfig?.connected && community.discordConfig?.status !== 'disconnected';
  const isTelegramConnected = community.telegramConfig?.connected && community.telegramConfig?.status !== 'disconnected';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-purple-950/30 p-6 sm:p-8 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Connect Your Community</span>
              </span>
              <span className="text-xs font-mono text-slate-400">
                · {community.name}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Direct Community Connection Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Connect your actual Discord server and Telegram group. Community members can create requests, claim deliverables, submit proof of work, and explore verified outcomes directly from chat.
            </p>
          </div>

          {/* Quick Status Chips */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            {/* Discord Status Chip */}
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2">
              <div className={`h-2.5 w-2.5 rounded-full ${isDiscordConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Discord Server</span>
                <span className="text-xs font-bold text-white">
                  {isDiscordConnected ? (community.discordConfig.serverName || 'Connected') : 'Not Connected'}
                </span>
              </div>
            </div>

            {/* Telegram Status Chip */}
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2">
              <div className={`h-2.5 w-2.5 rounded-full ${isTelegramConnected ? 'bg-sky-400 animate-pulse' : 'bg-slate-600'}`} />
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Telegram Group</span>
                <span className="text-xs font-bold text-white">
                  {isTelegramConnected ? (community.telegramConfig.groupTitle || 'Connected') : 'Not Connected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2 sm:gap-6 text-xs sm:text-sm font-semibold">
        <button
          onClick={() => setActiveTab('discord')}
          className={`flex items-center gap-2 pb-3 transition-colors ${
            activeTab === 'discord'
              ? 'border-b-2 border-indigo-500 text-indigo-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bot className="h-4 w-4" />
          <span>Discord Server Connection</span>
          {isDiscordConnected && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('telegram')}
          className={`flex items-center gap-2 pb-3 transition-colors ${
            activeTab === 'telegram'
              ? 'border-b-2 border-indigo-500 text-indigo-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Send className="h-4 w-4 text-sky-400" />
          <span>Telegram Group Connection</span>
          {isTelegramConnected && (
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('menu')}
          className={`flex items-center gap-2 pb-3 transition-colors ${
            activeTab === 'menu'
              ? 'border-b-2 border-indigo-500 text-indigo-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Pin className="h-4 w-4 text-amber-400" />
          <span>Publish In-Group Interactive Menu</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DISCORD SERVER CONNECTION                                          */}
      {/* ========================================================================= */}
      {activeTab === 'discord' && (
        <div className="space-y-6">
          {/* Status Diagnostic Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-1">
              <span className="text-[11px] font-mono text-slate-500 uppercase block">Bot Identity</span>
              <span className="text-sm font-bold text-white block">@Community Outcome</span>
              <span className="text-[11px] text-indigo-400 font-mono block">
                Slash Commands: 10 Registered
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-1">
              <span className="text-[11px] font-mono text-slate-500 uppercase block">Connected Server</span>
              <span className="text-sm font-bold text-white font-mono block truncate">
                {community.discordConfig?.serverName || 'No Server Associated'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono block">
                ID: {community.discordConfig?.serverId || 'None'}
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-1">
              <span className="text-[11px] font-mono text-slate-500 uppercase block">Connection State</span>
              <span className={`text-sm font-bold font-mono block ${isDiscordConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                {community.discordConfig?.status || 'not_connected'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono block">
                Presence: {isDiscordConnected ? 'Verified in Server' : 'Awaiting Installation'}
              </span>
            </div>
          </div>

          {/* Status Message Banner */}
          {discordStatusMsg && (
            <div className={`p-4 rounded-xl border text-xs leading-relaxed flex items-center justify-between gap-3 ${
              discordStatusMsg.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : discordStatusMsg.type === 'error'
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300'
            }`}>
              <div className="flex items-center gap-2">
                {discordStatusMsg.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
                {discordStatusMsg.type === 'error' && <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />}
                <span>{discordStatusMsg.text}</span>
              </div>
              <button onClick={() => setDiscordStatusMsg(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
          )}

          {/* Primary Connection Actions Block */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Bot className="h-5 w-5 text-indigo-400" />
                  <span>Discord Application Installation & Association</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Authorize the official Community OS bot into your Discord server with required permissions.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <a
                  href={discordInstallUrl || `/api/discord/connect?communityId=${community.id}&redirect=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-indigo-500 transition-all"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Install Bot into Server</span>
                </a>

                <button
                  onClick={handleVerifyDiscord}
                  disabled={isVerifyingDiscord}
                  className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isVerifyingDiscord ? 'animate-spin' : ''}`} />
                  <span>Verify Connection</span>
                </button>

                {isDiscordConnected && (
                  <>
                    {community.discordConfig?.serverId && (
                      <a
                        href={`https://discord.com/channels/${community.discordConfig.serverId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Open Server</span>
                      </a>
                    )}
                    <button
                      onClick={() => handleDisconnect('discord')}
                      className="flex items-center gap-1.5 rounded-lg border border-rose-900/50 bg-rose-950/40 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900/50 hover:text-rose-200 transition-colors"
                    >
                      <Unlink className="h-3.5 w-3.5" />
                      <span>Disconnect</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Server Verification & Linking Form */}
            <form onSubmit={handleConnectDiscordGuild} className="border-t border-slate-800 pt-6 space-y-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Server Association & Verification
              </h4>
              <p className="text-xs text-slate-400">
                After inviting the bot to your Discord server, enter your Server ID (Guild ID) below to complete association with <span className="text-indigo-300 font-semibold">{community.name}</span>.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Discord Server ID (Guild ID) *
                  </label>
                  <input
                    type="text"
                    value={discordGuildInput}
                    onChange={(e) => setDiscordGuildInput(e.target.value)}
                    placeholder="e.g. 11983029102938129"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Server Display Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={discordGuildNameInput}
                    onChange={(e) => setDiscordGuildNameInput(e.target.value)}
                    placeholder="e.g. Acme Community Discord"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Designated Actions Channel ID
                  </label>
                  <input
                    type="text"
                    value={discordChannelInput}
                    onChange={(e) => setDiscordChannelInput(e.target.value)}
                    placeholder="e.g. 1293847291029381"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-500">
                  Tip: Enable Developer Mode in Discord Settings to right-click your server icon and select &quot;Copy Server ID&quot;.
                </span>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition-colors"
                >
                  Verify & Save Server Connection
                </button>
              </div>
            </form>
          </div>

          {/* Discord Slash Commands Available */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Terminal className="h-4 w-4 text-indigo-400" />
              <span>Available Discord Slash Commands (10 Commands Registered)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { cmd: '/help', desc: 'Display full interactive command index' },
                { cmd: '/hub', desc: 'Direct link to community Web Action Hub' },
                { cmd: '/requests', desc: 'Browse open NeedSignal assistance requests' },
                { cmd: '/help-request', desc: 'Create a new assistance request with priority' },
                { cmd: '/tasks', desc: 'Browse active QuestLoop deliverables' },
                { cmd: '/mytasks', desc: 'View tasks assigned to your verified account' },
                { cmd: '/passport', desc: 'Inspect verified competencies & portfolio' },
                { cmd: '/contribution', desc: 'Submit deliverable evidence (SourceTrail)' },
                { cmd: '/connect', desc: 'Link Discord account to Community OS profile' },
                { cmd: '/status', desc: 'Check gateway latency and database sync' }
              ].map((c) => (
                <div key={c.cmd} className="p-2.5 rounded-lg border border-slate-800/80 bg-slate-900/60 text-xs">
                  <span className="font-mono font-bold text-indigo-300">{c.cmd}</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TELEGRAM GROUP CONNECTION                                          */}
      {/* ========================================================================= */}
      {activeTab === 'telegram' && (
        <div className="space-y-6">
          {/* Status Diagnostic Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-1">
              <span className="text-[11px] font-mono text-slate-500 uppercase block">Telegram Bot Identity</span>
              <span className="text-sm font-bold text-white block">@CommunityOutcomeBot</span>
              <span className="text-[11px] text-sky-400 font-mono block">
                Webhook: /api/telegram/webhook
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-1">
              <span className="text-[11px] font-mono text-slate-500 uppercase block">Connected Group</span>
              <span className="text-sm font-bold text-white font-mono block truncate">
                {community.telegramConfig?.groupTitle || 'No Group Associated'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono block">
                Chat ID: {community.telegramConfig?.groupId || 'None'}
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-1">
              <span className="text-[11px] font-mono text-slate-500 uppercase block">Connection State</span>
              <span className={`text-sm font-bold font-mono block ${isTelegramConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                {community.telegramConfig?.status || 'not_connected'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono block">
                Admin Verification: {isTelegramConnected ? 'Verified Administrator' : 'Pending Verification'}
              </span>
            </div>
          </div>

          {/* Status Message Banner */}
          {telegramStatusMsg && (
            <div className={`p-4 rounded-xl border text-xs leading-relaxed flex items-center justify-between gap-3 ${
              telegramStatusMsg.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : telegramStatusMsg.type === 'error'
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : 'bg-sky-950/40 border-sky-500/40 text-sky-300'
            }`}>
              <div className="flex items-center gap-2">
                {telegramStatusMsg.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
                {telegramStatusMsg.type === 'error' && <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />}
                <span>{telegramStatusMsg.text}</span>
              </div>
              <button onClick={() => setTelegramStatusMsg(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
          )}

          {/* Step-by-Step Telegram Group Connection Guide */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Send className="h-5 w-5 text-sky-400" />
                  <span>Connect Your Telegram Group or Supergroup</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Generate a cryptographic single-use linking code and send it inside your Telegram group as an administrator.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleGenerateTelegramChallenge}
                  disabled={isGeneratingChallenge}
                  className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-sky-500 transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{telegramChallenge ? 'Regenerate Code' : 'Generate Group Connection Code'}</span>
                </button>

                <button
                  onClick={handleVerifyTelegram}
                  disabled={isVerifyingTelegram}
                  className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isVerifyingTelegram ? 'animate-spin' : ''}`} />
                  <span>Check Bot Status</span>
                </button>

                {isTelegramConnected && (
                  <button
                    onClick={() => handleDisconnect('telegram')}
                    className="flex items-center gap-1.5 rounded-lg border border-rose-900/50 bg-rose-950/40 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900/50 hover:text-rose-200 transition-colors"
                  >
                    <Unlink className="h-3.5 w-3.5" />
                    <span>Disconnect</span>
                  </button>
                )}
              </div>
            </div>

            {/* Generated Challenge Box */}
            {telegramChallenge && (
              <div className="rounded-xl border border-sky-500/40 bg-sky-950/30 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-sky-300 uppercase tracking-wider">
                    Single-Use Group Connection Challenge
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Expires in 15 minutes
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-lg">
                  <div className="font-mono text-sm sm:text-base font-bold text-white tracking-wide">
                    {telegramChallenge.command}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(telegramChallenge.command)}
                      className="flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 transition-colors"
                    >
                      {copiedCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedCode ? 'Copied!' : 'Copy Command'}</span>
                    </button>
                    <a
                      href={telegramChallenge.botLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Open Bot in Telegram</span>
                    </a>
                  </div>
                </div>

                {/* Step Instructions */}
                <div className="space-y-2 text-xs text-slate-300">
                  <span className="font-bold text-white block">Execution Steps:</span>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                    {telegramChallenge.instructions.map((step, idx) => (
                      <li key={idx} className="leading-relaxed">{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            )}

            {/* Permissions Explanation */}
            <div className="border-t border-slate-800 pt-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Required Telegram Bot Permissions & Why They Are Needed
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1">
                  <span className="font-bold text-white">Send Messages</span>
                  <p className="text-slate-400 text-[11px]">
                    Allows the bot to respond to slash commands (/hub, /requests, /tasks) and interact with members.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1">
                  <span className="font-bold text-white">Pin Messages</span>
                  <p className="text-slate-400 text-[11px]">
                    Allows pinning the Community OS Action Hub interactive menu at the top of the group chat.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1">
                  <span className="font-bold text-white">Administrator Role</span>
                  <p className="text-slate-400 text-[11px]">
                    Required by Telegram API to verify genuine group administrator status during association.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PUBLISH IN-GROUP INTERACTIVE MENU                                  */}
      {/* ========================================================================= */}
      {activeTab === 'menu' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-6">
            <div className="space-y-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Pin className="h-5 w-5 text-amber-400" />
                <span>Publish In-Group Persistent Action Menu</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                Publish a permanent, interactive action hub message into your Discord channel or Telegram group.
                Members can tap buttons like &quot;NeedSignal Requests&quot;, &quot;QuestLoop Tasks&quot;, and &quot;Member Passport&quot; without leaving the chat.
              </p>
            </div>

            {/* Platform Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setPublishingPlatform('telegram')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  publishingPlatform === 'telegram'
                    ? 'border-sky-500 bg-sky-950/30 ring-1 ring-sky-500'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-sm flex items-center gap-2">
                    <Send className="h-4 w-4 text-sky-400" />
                    <span>Telegram Group</span>
                  </span>
                  {isTelegramConnected ? (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                      Connected: {community.telegramConfig?.groupTitle}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                      Not Connected
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Sends an interactive message with Telegram Inline Keyboard buttons. Can be automatically pinned to the top of the group.
                </p>
              </button>

              <button
                onClick={() => setPublishingPlatform('discord')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  publishingPlatform === 'discord'
                    ? 'border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-sm flex items-center gap-2">
                    <Bot className="h-4 w-4 text-indigo-400" />
                    <span>Discord Channel</span>
                  </span>
                  {isDiscordConnected ? (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                      Connected: {community.discordConfig?.serverName}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                      Not Connected
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Sends a rich Discord embed with ActionRow component buttons for instant slash command parity.
                </p>
              </button>
            </div>

            {/* Menu Options & Preview */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Menu Preview ({publishingPlatform.toUpperCase()})
                </span>
                {publishingPlatform === 'telegram' && (
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pinTelegramMenu}
                      onChange={(e) => setPinTelegramMenu(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-sky-600 focus:ring-0"
                    />
                    <span>Pin message to group header</span>
                  </label>
                )}
              </div>

              {/* Visual Preview */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 space-y-3 font-sans">
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>🌟 Community OS Hub — {community.name}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Welcome to our community workspace! Use the instant buttons below to participate, claim deliverables, and view verified outcomes:
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="rounded border border-indigo-500/40 bg-indigo-950/40 p-2 text-center text-xs font-semibold text-indigo-300">
                    🚀 Open Action Hub
                  </div>
                  <div className="rounded border border-indigo-500/40 bg-indigo-950/40 p-2 text-center text-xs font-semibold text-indigo-300">
                    🆘 NeedSignal Requests
                  </div>
                  <div className="rounded border border-slate-700 bg-slate-800 p-2 text-center text-xs font-semibold text-slate-300">
                    📋 QuestLoop Tasks
                  </div>
                  <div className="rounded border border-slate-700 bg-slate-800 p-2 text-center text-xs font-semibold text-slate-300">
                    🎖️ Member Passport
                  </div>
                </div>
              </div>
            </div>

            {/* Action Feedback Result */}
            {publishResult && (
              <div className={`p-4 rounded-xl border text-xs leading-relaxed flex items-center gap-2 ${
                publishResult.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}>
                {publishResult.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                )}
                <span>{publishResult.message}</span>
              </div>
            )}

            {/* Publish Trigger Button */}
            <div className="flex items-center justify-end">
              <button
                onClick={handlePublishMenu}
                disabled={isPublishingMenu}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-indigo-500 transition-colors"
              >
                <Pin className={`h-4 w-4 ${isPublishingMenu ? 'animate-bounce' : ''}`} />
                <span>
                  {isPublishingMenu ? 'Publishing Interactive Menu...' : `Publish to ${publishingPlatform === 'discord' ? 'Discord Channel' : 'Telegram Group'}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
