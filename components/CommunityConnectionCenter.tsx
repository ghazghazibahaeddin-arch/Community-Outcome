'use client';

import React, { useState, useEffect } from 'react';
import { Community, Language, User, UserRole, IntegrationCheckResult } from '@/lib/types';
import {
  Bot,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Send,
  Unlink,
  Copy,
  Check,
  Pin,
  Sparkles,
  Terminal,
  Wrench
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
  const isRtl = lang === 'ar';

  // Two completely non-overlapping platform hubs: 'discord' | 'telegram'
  const [activeHub, setActiveHub] = useState<'discord' | 'telegram'>('discord');

  // Discord Hub State
  const [isVerifyingDiscord, setIsVerifyingDiscord] = useState(false);
  const [isRegisteringDiscordCommands, setIsRegisteringDiscordCommands] = useState(false);
  const [isPublishingDiscordMenu, setIsPublishingDiscordMenu] = useState(false);
  const [discordInstallUrl, setDiscordInstallUrl] = useState<string | null>(null);
  const [discordGuildInput, setDiscordGuildInput] = useState(community.discordConfig?.serverId || '');
  const [discordGuildNameInput, setDiscordGuildNameInput] = useState(community.discordConfig?.serverName || '');
  const [discordChannelInput, setDiscordChannelInput] = useState(community.discordConfig?.channelId || '');
  const [discordStatusMsg, setDiscordStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [discordLiveCheck, setDiscordLiveCheck] = useState<IntegrationCheckResult | null>(null);

  // Telegram Hub State
  const [isVerifyingTelegram, setIsVerifyingTelegram] = useState(false);
  const [isSyncingTelegramWebhook, setIsSyncingTelegramWebhook] = useState(false);
  const [isPollingTelegramUpdates, setIsPollingTelegramUpdates] = useState(false);
  const [isPublishingTelegramMenu, setIsPublishingTelegramMenu] = useState(false);
  const [pinTelegramMenu, setPinTelegramMenu] = useState(true);
  const [telegramWebhookUrl, setTelegramWebhookUrl] = useState<string | null>(null);
  const [telegramWebhookError, setTelegramWebhookError] = useState<string | null>(null);
  const [telegramPendingUpdates, setTelegramPendingUpdates] = useState<number | null>(null);
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

  // Inline Disconnect State
  const [confirmDisconnect, setConfirmDisconnect] = useState<'discord' | 'telegram' | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const isOwnerOrAdmin = ['platform_admin', 'community_owner', 'admin'].includes(currentUserRole);

  // Sync manual server inputs when selected community changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDiscordGuildInput(community.discordConfig?.serverId || '');
      setDiscordGuildNameInput(community.discordConfig?.serverName || '');
      setDiscordChannelInput(community.discordConfig?.channelId || '');
      setConfirmDisconnect(null);
      setTelegramChallenge(null);
      setDiscordStatusMsg(null);
      setTelegramStatusMsg(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [community.id, community.discordConfig?.serverId, community.discordConfig?.serverName, community.discordConfig?.channelId]);

  // Load Discord install URL and Telegram webhook info on mount
  useEffect(() => {
    let active = true;
    const fetchInitialInfo = async () => {
      try {
        const res = await fetch(`/api/discord/connect?communityId=${community.id}`);
        const data = await res.json();
        if (active && data.success && data.installUrl) {
          setDiscordInstallUrl(data.installUrl);
        }
      } catch {}
      try {
        const tgRes = await fetch('/api/telegram/register-webhook');
        const tgData = await tgRes.json();
        if (active && tgData.success && tgData.webhookInfo) {
          setTelegramWebhookUrl(tgData.webhookInfo.url || null);
          setTelegramWebhookError(tgData.webhookInfo.last_error_message || null);
          if (typeof tgData.webhookInfo.pending_update_count === 'number') {
            setTelegramPendingUpdates(tgData.webhookInfo.pending_update_count);
          }
        }
      } catch {}
    };
    if (isOwnerOrAdmin) {
      fetchInitialInfo();
    }
    return () => {
      active = false;
    };
  }, [community.id, isOwnerOrAdmin]);

  // Handle Discord Live Verification
  const handleVerifyDiscord = async () => {
    setIsVerifyingDiscord(true);
    setDiscordStatusMsg(null);
    try {
      const res = await fetch('/api/integrations/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ platform: 'discord' })
      });
      const data = await res.json();
      if (data.success && data.result) {
        setDiscordLiveCheck(data.result);
        setDiscordStatusMsg({
          type: data.result.status === 'connected' ? 'success' : 'info',
          text:
            data.result.status === 'connected'
              ? isRtl
                ? `بوت Discord يعمل! ${data.result.botName} (@${data.result.botUsername}) متصل وجاهز للأوامر.`
                : `Discord Bot verified! ${data.result.botName} (@${data.result.botUsername}) is online.`
              : data.result.details || 'Discord bot status checked.'
        });
      }
    } catch (err: any) {
      setDiscordStatusMsg({ type: 'error', text: `Verification failed: ${err.message}` });
    } finally {
      setIsVerifyingDiscord(false);
    }
  };

  // Register Discord Slash Commands
  const handleRegisterDiscordCommands = async () => {
    setIsRegisteringDiscordCommands(true);
    setDiscordStatusMsg(null);
    try {
      const res = await fetch('/api/discord/register-commands', {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setDiscordStatusMsg({
          type: 'error',
          text: data.error || 'Failed to register Discord slash commands.'
        });
        return;
      }
      setDiscordStatusMsg({
        type: 'success',
        text: isRtl
          ? `تم تسجيل وتحديث ${data.registeredCount || 10} أوامر Slash لبوت Discord بنجاح!`
          : `Successfully registered & synced ${data.registeredCount || 10} Discord Slash Commands!`
      });
    } catch (err: any) {
      setDiscordStatusMsg({ type: 'error', text: `Command registration failed: ${err.message}` });
    } finally {
      setIsRegisteringDiscordCommands(false);
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
        credentials: 'include',
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
        text: isRtl
          ? `تم ربط خادم Discord "${data.server?.name || discordGuildInput}" بالمجتمع بنجاح!`
          : `Successfully linked Discord server "${data.server?.name || discordGuildInput}" to ${community.name}!`
      });
      onRefresh();
    } catch (err: any) {
      setDiscordStatusMsg({ type: 'error', text: `Connection error: ${err.message}` });
    }
  };

  // Publish Interactive Menu to Discord
  const handlePublishDiscordMenu = async () => {
    setIsPublishingDiscordMenu(true);
    setDiscordStatusMsg(null);
    try {
      const res = await fetch('/api/discord/publish-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ communityId: community.id })
      });
      const data = await res.json();
      if (data.success) {
        setDiscordStatusMsg({
          type: 'success',
          text: data.details || 'Published interactive action hub menu to your Discord channel!'
        });
        onRefresh();
      } else {
        setDiscordStatusMsg({
          type: 'error',
          text: data.error || 'Failed to publish interactive menu to Discord.'
        });
      }
    } catch (err: any) {
      setDiscordStatusMsg({ type: 'error', text: `Publish error: ${err.message}` });
    } finally {
      setIsPublishingDiscordMenu(false);
    }
  };

  // Handle Telegram Live Verification & Webhook Info
  const handleVerifyTelegram = async () => {
    setIsVerifyingTelegram(true);
    setTelegramStatusMsg(null);
    try {
      const [verifyRes, whRes] = await Promise.all([
        fetch('/api/integrations/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ platform: 'telegram' })
        }),
        fetch('/api/telegram/register-webhook')
      ]);
      const data = await verifyRes.json();
      const whData = await whRes.json();
      const whUrl = whData?.webhookInfo?.url || data?.result?.webhookUrl || null;
      const whError = whData?.webhookInfo?.last_error_message || data?.result?.lastErrorMessage || null;
      const whPending =
        typeof whData?.webhookInfo?.pending_update_count === 'number'
          ? whData.webhookInfo.pending_update_count
          : typeof data?.result?.pendingUpdateCount === 'number'
          ? data.result.pendingUpdateCount
          : null;

      setTelegramWebhookUrl(whUrl);
      setTelegramWebhookError(whError);
      if (whPending !== null) setTelegramPendingUpdates(whPending);

      if (data.success && data.result) {
        setTelegramLiveCheck(data.result);
        if (whError) {
          setTelegramStatusMsg({
            type: 'error',
            text: isRtl
              ? `خطأ في Webhook تيلغرام: ${whError} — اضغط "مزامنة Webhook" لإعادة التسجيل.`
              : `Telegram Webhook Error: ${whError} — Click "Sync Telegram Webhook" to repair.`
          });
        } else if (!whUrl) {
          setTelegramStatusMsg({
            type: 'info',
            text: isRtl
              ? `توكن البوت @${data.result.botUsername} سليم، لكن الـ Webhook غير مسجّل حالياً (الرسائل المعلقة: ${whPending ?? 0}). اضغط "مزامنة Webhook" لتفعيل الرد التلقائي.`
              : `Bot @${data.result.botUsername} token is valid, but NO Webhook is registered yet (Pending: ${whPending ?? 0}). Click "Sync Telegram Webhook" to enable instant replies.`
          });
        } else {
          setTelegramStatusMsg({
            type: data.result.status === 'connected' ? 'success' : 'info',
            text:
              data.result.status === 'connected'
                ? isRtl
                  ? `بوت Telegram نشط! @${data.result.botUsername} متصل والـ Webhook فعّال على: ${whUrl}`
                  : `Telegram Bot verified! @${data.result.botUsername} is online with webhook active at: ${whUrl}`
                : data.result.details || 'Telegram bot check completed.'
          });
        }
      }
    } catch (err: any) {
      setTelegramStatusMsg({ type: 'error', text: `Verification failed: ${err.message}` });
    } finally {
      setIsVerifyingTelegram(false);
    }
  };

  // Sync / Register Telegram Webhook
  const handleSyncTelegramWebhook = async () => {
    setIsSyncingTelegramWebhook(true);
    setTelegramStatusMsg(null);
    try {
      const res = await fetch('/api/telegram/register-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setTelegramStatusMsg({
          type: 'error',
          text: data.error || 'Failed to sync Telegram webhook.'
        });
        return;
      }
      setTelegramWebhookUrl(data.webhookUrl || null);
      setTelegramWebhookError(data.webhookInfo?.last_error_message || null);
      if (typeof data.webhookInfo?.pending_update_count === 'number') {
        setTelegramPendingUpdates(data.webhookInfo.pending_update_count);
      }
      setTelegramStatusMsg({
        type: 'success',
        text: isRtl
          ? `تم مزامنة Webhook الخاص ببوت تيلغرام بنجاح: ${data.webhookUrl}`
          : `Telegram Webhook synced successfully: ${data.webhookUrl}`
      });
    } catch (err: any) {
      setTelegramStatusMsg({ type: 'error', text: `Webhook sync failed: ${err.message}` });
    } finally {
      setIsSyncingTelegramWebhook(false);
    }
  };

  // Sync Telegram "/" Command Menu & Pull/Reply Pending Bot Messages (for dev/local without public webhook)
  const handlePollTelegramLive = async () => {
    setIsPollingTelegramUpdates(true);
    setTelegramStatusMsg(null);
    try {
      const res = await fetch('/api/telegram/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ syncCommands: true, limit: 25 })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setTelegramStatusMsg({
          type: 'error',
          text: data.error || 'Failed to sync Telegram commands/messages.'
        });
        return;
      }
      setTelegramPendingUpdates(0);
      setTelegramStatusMsg({
        type: 'success',
        text: data.message || (isRtl ? 'تمت مزامنة أوامر تيلغرام ومعالجة الرسائل بنجاح!' : 'Telegram commands & messages synced!')
      });
      if (data.processedCount > 0) onRefresh();
    } catch (err: any) {
      setTelegramStatusMsg({ type: 'error', text: `Live sync error: ${err.message}` });
    } finally {
      setIsPollingTelegramUpdates(false);
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
        credentials: 'include',
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

  // Publish Interactive Menu to Telegram
  const handlePublishTelegramMenu = async () => {
    setIsPublishingTelegramMenu(true);
    setTelegramStatusMsg(null);
    try {
      const res = await fetch('/api/telegram/publish-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ communityId: community.id, pinMessage: pinTelegramMenu })
      });
      const data = await res.json();
      if (data.success) {
        setTelegramStatusMsg({
          type: 'success',
          text: data.details || 'Interactive hub menu published to your Telegram group!'
        });
        onRefresh();
      } else {
        setTelegramStatusMsg({
          type: 'error',
          text: data.error || 'Failed to publish interactive menu to Telegram.'
        });
      }
    } catch (err: any) {
      setTelegramStatusMsg({ type: 'error', text: `Publish error: ${err.message}` });
    } finally {
      setIsPublishingTelegramMenu(false);
    }
  };

  // Handle Disconnect via inline confirmation
  const handleDisconnect = async (platform: 'discord' | 'telegram') => {
    setIsDisconnecting(true);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
      if (!res.ok || !data.success) {
        const msg = data.error || `Failed to disconnect ${platform}`;
        if (platform === 'discord') setDiscordStatusMsg({ type: 'error', text: msg });
        else setTelegramStatusMsg({ type: 'error', text: msg });
        return;
      }
      setConfirmDisconnect(null);
      if (platform === 'discord') {
        setDiscordStatusMsg({ type: 'info', text: 'Discord server disconnected.' });
      } else {
        setTelegramStatusMsg({ type: 'info', text: 'Telegram group disconnected.' });
      }
      onRefresh();
    } catch (err: any) {
      const msg = err?.message || `Failed to disconnect ${platform}`;
      if (platform === 'discord') setDiscordStatusMsg({ type: 'error', text: msg });
      else setTelegramStatusMsg({ type: 'error', text: msg });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2500);
      }
    } catch {}
  };

  const isDiscordConnected = community.discordConfig?.connected && community.discordConfig?.status !== 'disconnected';
  const isTelegramConnected = community.telegramConfig?.connected && community.telegramConfig?.status !== 'disconnected';

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-sky-950/30 p-6 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-indigo-500/40 bg-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-300">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{isRtl ? 'مركز ربط البوتات للمالك' : 'Owner Bot & Platform Hubs'}</span>
              </span>
              <span className="text-xs font-mono text-slate-400">· {community.name}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {isRtl ? 'إدارة منفصلة ومنظمة لبوت ديسكورد وبوت تيلغرام' : 'Dedicated Discord Server & Telegram Group Hubs'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isRtl
                ? 'كل منصة لها مساحتها المستقلة بالكامل: ربط الخادم أو المجموعة، فحص صحة البوت، تسجيل الأوامر والـ Webhook، ونشر القائمة التفاعلية.'
                : 'Each platform has its own clean, non-overlapping control hub: connect your server or group, verify live bot health, sync commands/webhooks, and publish interactive menus.'}
            </p>
          </div>

          {/* Crisp Non-Pulsing Status Chips */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveHub('discord')}
              className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-start transition-colors ${
                activeHub === 'discord'
                  ? 'border-[#5865F2] bg-[#5865F2]/15'
                  : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
              }`}
            >
              <Bot className="h-4 w-4 text-[#9aa8ff] shrink-0" />
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Discord Server</span>
                <span className="text-xs font-bold text-white block max-w-[140px] truncate">
                  {isDiscordConnected ? community.discordConfig.serverName || 'Connected' : isRtl ? 'غير مربوط' : 'Not Connected'}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveHub('telegram')}
              className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-start transition-colors ${
                activeHub === 'telegram'
                  ? 'border-[#229ED9] bg-[#229ED9]/15'
                  : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
              }`}
            >
              <Send className="h-4 w-4 text-[#5dc5f7] shrink-0" />
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Telegram Group</span>
                <span className="text-xs font-bold text-white block max-w-[140px] truncate">
                  {isTelegramConnected ? community.telegramConfig.groupTitle || 'Connected' : isRtl ? 'غير مربوط' : 'Not Connected'}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Non-Overlapping Hub Switcher (Discord vs Telegram) */}
      <div className="grid grid-cols-2 gap-3 p-1.5 rounded-xl bg-slate-950 border border-slate-800">
        <button
          type="button"
          onClick={() => setActiveHub('discord')}
          className={`flex items-center justify-center gap-2 rounded-lg py-2.5 px-4 text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
            activeHub === 'discord'
              ? 'bg-[#5865F2]/25 text-[#a5b2ff] border border-[#5865F2]/50 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <Bot className="h-4 w-4 shrink-0" />
          <span>{isRtl ? 'مركز ديسكورد (خادم & بوت)' : 'Discord Server Hub'}</span>
          {isDiscordConnected && (
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-mono text-emerald-300">
              ON
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveHub('telegram')}
          className={`flex items-center justify-center gap-2 rounded-lg py-2.5 px-4 text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
            activeHub === 'telegram'
              ? 'bg-[#229ED9]/25 text-[#6ecdf9] border border-[#229ED9]/50 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <Send className="h-4 w-4 shrink-0" />
          <span>{isRtl ? 'مركز تيلغرام (مجموعة & بوت)' : 'Telegram Group Hub'}</span>
          {isTelegramConnected && (
            <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-mono text-sky-300">
              ON
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* HUB 1: DISCORD SERVER & BOT (100% SELF-CONTAINED)                         */}
      {/* ========================================================================= */}
      {activeHub === 'discord' && (
        <div className="space-y-6">
          {/* Status Diagnostic Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-1">
              <span className="text-[11px] font-mono text-slate-500 uppercase block">Discord Bot Identity</span>
              <span className="text-sm font-bold text-white block">
                {discordLiveCheck?.botName || '@Community Outcome'}
              </span>
              <span className="text-[11px] text-[#9aa8ff] font-mono block">
                {discordLiveCheck?.status === 'connected' ? 'Bot API Verified Online' : 'Ed25519 Slash Endpoint Ready'}
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-1">
              <span className="text-[11px] font-mono text-slate-500 uppercase block">Connected Discord Server</span>
              <span className="text-sm font-bold text-white font-mono block truncate">
                {community.discordConfig?.serverName || 'No Server Linked'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono block">
                Guild ID: {community.discordConfig?.serverId || 'None'}
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-1">
              <span className="text-[11px] font-mono text-slate-500 uppercase block">Connection & Channel</span>
              <span className={`text-sm font-bold font-mono block ${isDiscordConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                {community.discordConfig?.status || 'not_connected'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono block">
                Channel ID: {community.discordConfig?.channelId || 'Default'}
              </span>
            </div>
          </div>

          {discordStatusMsg && (
            <div
              className={`p-4 rounded-xl border text-xs leading-relaxed flex items-center justify-between gap-3 ${
                discordStatusMsg.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : discordStatusMsg.type === 'error'
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {discordStatusMsg.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
                {discordStatusMsg.type === 'error' && <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />}
                <span>{discordStatusMsg.text}</span>
              </div>
              <button type="button" onClick={() => setDiscordStatusMsg(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
          )}

          {/* Discord Installation, Verification & Slash Commands Sync */}
          <div className="rounded-2xl border border-[#5865F2]/30 bg-slate-900/40 p-6 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Bot className="h-5 w-5 text-[#9aa8ff]" />
                  <span>{isRtl ? 'تثبيت وتفعيل بوت ديسكورد في خادمك' : 'Discord Bot Installation & Live Sync'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {isRtl
                    ? 'أضف البوت إلى خادمك، ثم سجّل أوامر Slash العشرة وتحقق من اتصاله الفعلي بـ Discord API.'
                    : 'Invite the bot into your server, register/update the 10 slash commands, and verify live Discord API connectivity.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={discordInstallUrl || `/api/discord/connect?communityId=${community.id}&redirect=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg bg-[#5865F2] px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-[#4956e0] transition-all whitespace-nowrap"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>{isRtl ? 'إضافة البوت للخادم' : 'Install Bot into Server'}</span>
                </a>

                <button
                  type="button"
                  onClick={handleRegisterDiscordCommands}
                  disabled={isRegisteringDiscordCommands}
                  className="flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/15 px-3 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/25 transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  <Wrench className={`h-3.5 w-3.5 ${isRegisteringDiscordCommands ? 'animate-spin' : ''}`} />
                  <span>{isRtl ? 'تحديث أوامر Slash (10)' : 'Sync 10 Slash Commands'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleVerifyDiscord}
                  disabled={isVerifyingDiscord}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isVerifyingDiscord ? 'animate-spin' : ''}`} />
                  <span>{isRtl ? 'فحص البوت' : 'Verify Bot API'}</span>
                </button>

                {isDiscordConnected && (
                  <>
                    {community.discordConfig?.serverId && (
                      <a
                        href={`https://discord.com/channels/${community.discordConfig.serverId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white whitespace-nowrap"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>{isRtl ? 'فتح الخادم' : 'Open Server'}</span>
                      </a>
                    )}
                    {confirmDisconnect === 'discord' ? (
                      <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/60 px-2.5 py-1.5 text-xs">
                        <span className="text-rose-200 font-medium">Disconnect?</span>
                        <button
                          type="button"
                          onClick={() => handleDisconnect('discord')}
                          disabled={isDisconnecting}
                          className="rounded bg-rose-600 px-2 py-0.5 font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                        >
                          {isDisconnecting ? '...' : 'Confirm'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDisconnect(null)}
                          className="rounded bg-slate-800 px-2 py-0.5 text-slate-300 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDisconnect('discord')}
                        className="flex items-center gap-1.5 rounded-lg border border-rose-900/50 bg-rose-950/40 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900/50 hover:text-rose-200 transition-colors whitespace-nowrap"
                      >
                        <Unlink className="h-3.5 w-3.5" />
                        <span>{isRtl ? 'فصل الخادم' : 'Disconnect'}</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Server Verification & Linking Form */}
            <form onSubmit={handleConnectDiscordGuild} className="border-t border-slate-800 pt-5 space-y-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {isRtl ? 'ربط معرف خادم Discord وقناة الإجراءات' : 'Link Server ID & Designated Channel'}
              </h4>
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
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
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
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
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
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-slate-500">
                  Tip: Enable Developer Mode in Discord Settings to copy your Server ID & Channel ID.
                </span>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition-colors whitespace-nowrap"
                >
                  {isRtl ? 'حفظ وربط الخادم' : 'Verify & Save Server Connection'}
                </button>
              </div>
            </form>
          </div>

          {/* Discord Interactive Menu Publisher (Inside Discord Hub!) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Pin className="h-4 w-4 text-amber-400" />
                  <span>{isRtl ? 'نشر القائمة التفاعلية داخل قناة ديسكورد' : 'Publish Persistent Interactive Hub to Discord Channel'}</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Sends a rich Discord embed with clickable ActionRow buttons (Action Hub, NeedSignal Requests, QuestLoop Tasks, Passport).
                </p>
              </div>
              <button
                type="button"
                onClick={handlePublishDiscordMenu}
                disabled={isPublishingDiscordMenu}
                className="flex items-center gap-2 rounded-lg bg-[#5865F2] px-4 py-2 text-xs font-bold text-white hover:bg-[#4956e0] transition-colors whitespace-nowrap disabled:opacity-50"
              >
                <Pin className="h-3.5 w-3.5" />
                <span>
                  {isPublishingDiscordMenu
                    ? isRtl ? 'جاري النشر...' : 'Publishing...'
                    : isRtl ? 'نشر القائمة في Discord' : 'Publish Discord Menu'}
                </span>
              </button>
            </div>
          </div>

          {/* Discord Slash Commands Reference */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Terminal className="h-4 w-4 text-[#9aa8ff]" />
              <span>Discord Bot Slash Commands (10 Active Commands)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {[
                { cmd: '/help', desc: 'Display full interactive command index' },
                { cmd: '/hub', desc: 'Direct link to community Web Action Hub' },
                { cmd: '/requests', desc: 'Browse open NeedSignal assistance requests' },
                { cmd: '/help-request', desc: 'Create a new assistance request with priority' },
                { cmd: '/tasks', desc: 'Browse active QuestLoop deliverables' },
                { cmd: '/mytasks', desc: 'View tasks assigned to your verified account' },
                { cmd: '/passport', desc: 'Inspect verified competencies & portfolio' },
                { cmd: '/contribution', desc: 'Submit deliverable evidence (SourceTrail)' },
                { cmd: '/connect [code]', desc: 'Link Discord profile or verify OS-XXXX code' },
                { cmd: '/status', desc: 'Check Discord gateway & database sync' }
              ].map((c) => (
                <div key={c.cmd} className="p-2.5 rounded-lg border border-slate-800/80 bg-slate-950/60 text-xs">
                  <span className="font-mono font-bold text-[#9aa8ff]">{c.cmd}</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HUB 2: TELEGRAM GROUP & BOT (100% SELF-CONTAINED)                         */}
      {/* ========================================================================= */}
      {activeHub === 'telegram' && (
        <div className="space-y-6">
          {/* Status Diagnostic Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-1">
              <span className="text-[11px] font-mono text-slate-500 uppercase block">Telegram Bot Identity</span>
              <span className="text-sm font-bold text-white block">
                @{telegramLiveCheck?.botUsername || 'CommunityOutcomeBot'}
              </span>
              <span className={`text-[11px] font-mono block truncate ${telegramWebhookUrl && !telegramWebhookError ? 'text-emerald-400' : 'text-amber-400'}`}>
                {telegramWebhookUrl ? `Webhook: ${telegramWebhookUrl}` : 'Webhook: Not Registered'}
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-1">
              <span className="text-[11px] font-mono text-slate-500 uppercase block">Connected Telegram Group</span>
              <span className="text-sm font-bold text-white font-mono block truncate">
                {community.telegramConfig?.groupTitle || 'No Group Linked'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono block">
                Chat ID: {community.telegramConfig?.groupId || 'None'}
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-1">
              <span className="text-[11px] font-mono text-slate-500 uppercase block">Group & Webhook State</span>
              <span className={`text-sm font-bold font-mono block ${telegramWebhookError ? 'text-rose-400' : telegramWebhookUrl ? 'text-emerald-400' : 'text-amber-400'}`}>
                {telegramWebhookError ? 'webhook_error' : telegramWebhookUrl ? (community.telegramConfig?.status || 'webhook_active') : 'webhook_unset'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono block truncate">
                {telegramWebhookError
                  ? `Err: ${telegramWebhookError}`
                  : telegramPendingUpdates !== null
                  ? `Pending Queue: ${telegramPendingUpdates}`
                  : isTelegramConnected
                  ? 'Admin Verification: Active'
                  : 'Pending Verification'}
              </span>
            </div>
          </div>

          {(!telegramWebhookUrl || telegramWebhookError) && (
            <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-950/30 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">
                    {telegramWebhookError
                      ? isRtl ? 'تم اكتشاف خطأ في Webhook تيلغرام' : 'Telegram Webhook Error Detected'
                      : isRtl ? 'الـ Webhook غير مسجّل على تيلغرام حالياً' : 'Telegram Webhook Not Registered'}
                  </div>
                  <div className="text-amber-200/80 mt-0.5">
                    {telegramWebhookError
                      ? telegramWebhookError
                      : isRtl
                      ? 'لن يرد البوت تلقائياً على الأوامر في تيلغرام حتى تضغط "تفعيل Webhook الآن" لربطه بـ Cloudflare.'
                      : 'The bot will not auto-reply in Telegram until you click "Sync Telegram Webhook" to bind Telegram to your Cloudflare API.'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSyncTelegramWebhook}
                disabled={isSyncingTelegramWebhook}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                <Wrench className={`h-3.5 w-3.5 ${isSyncingTelegramWebhook ? 'animate-spin' : ''}`} />
                <span>{isRtl ? 'تفعيل Webhook الآن' : 'Activate Webhook Now'}</span>
              </button>
            </div>
          )}

          {telegramStatusMsg && (
            <div
              className={`p-4 rounded-xl border text-xs leading-relaxed flex items-center justify-between gap-3 ${
                telegramStatusMsg.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : telegramStatusMsg.type === 'error'
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  : 'bg-sky-950/40 border-sky-500/40 text-sky-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {telegramStatusMsg.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
                {telegramStatusMsg.type === 'error' && <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />}
                <span>{telegramStatusMsg.text}</span>
              </div>
              <button type="button" onClick={() => setTelegramStatusMsg(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
          )}

          {/* Telegram Group Linking & Webhook Sync */}
          <div className="rounded-2xl border border-[#229ED9]/30 bg-slate-900/40 p-6 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Send className="h-5 w-5 text-[#5dc5f7]" />
                  <span>{isRtl ? 'ربط مجموعة تيلغرام وتفعيل الـ Webhook' : 'Connect Telegram Group & Sync Webhook'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {isRtl
                    ? 'أنشئ كود ربط خاصاً للمجموعة ثم أرسله داخل الجروب بعد إضافة البوت كمشرف، واضغط مزامنة Webhook لضمان استجابة البوت الفورية.'
                    : 'Generate a single-use group code, send it inside your Telegram group with the bot added as admin, and sync the webhook endpoint.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateTelegramChallenge}
                  disabled={isGeneratingChallenge}
                  className="flex items-center gap-1.5 rounded-lg bg-[#229ED9] px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-[#1e8ec3] transition-all whitespace-nowrap disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>
                    {telegramChallenge
                      ? isRtl ? 'توليد كود جديد' : 'Regenerate Group Code'
                      : isRtl ? 'توليد كود ربط المجموعة' : 'Generate Group Code'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncTelegramWebhook}
                  disabled={isSyncingTelegramWebhook}
                  className="flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-200 hover:bg-sky-500/25 transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  <Wrench className={`h-3.5 w-3.5 ${isSyncingTelegramWebhook ? 'animate-spin' : ''}`} />
                  <span>{isRtl ? 'مزامنة Webhook' : 'Sync Telegram Webhook'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePollTelegramLive}
                  disabled={isPollingTelegramUpdates}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25 transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  <Terminal className={`h-3.5 w-3.5 ${isPollingTelegramUpdates ? 'animate-spin' : ''}`} />
                  <span>{isRtl ? 'سحب والرد على الرسائل + مزامنة /' : 'Sync / Commands & Pull Updates'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleVerifyTelegram}
                  disabled={isVerifyingTelegram}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isVerifyingTelegram ? 'animate-spin' : ''}`} />
                  <span>{isRtl ? 'فحص البوت' : 'Check Bot & Webhook'}</span>
                </button>

                {isTelegramConnected && (
                  confirmDisconnect === 'telegram' ? (
                    <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/60 px-2.5 py-1.5 text-xs">
                      <span className="text-rose-200 font-medium">Disconnect?</span>
                      <button
                        type="button"
                        onClick={() => handleDisconnect('telegram')}
                        disabled={isDisconnecting}
                        className="rounded bg-rose-600 px-2 py-0.5 font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                      >
                        {isDisconnecting ? '...' : 'Confirm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDisconnect(null)}
                        className="rounded bg-slate-800 px-2 py-0.5 text-slate-300 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDisconnect('telegram')}
                      className="flex items-center gap-1.5 rounded-lg border border-rose-900/50 bg-rose-950/40 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900/50 hover:text-rose-200 transition-colors whitespace-nowrap"
                    >
                      <Unlink className="h-3.5 w-3.5" />
                      <span>{isRtl ? 'فصل المجموعة' : 'Disconnect'}</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {telegramChallenge && (
              <div className="rounded-xl border border-sky-500/40 bg-sky-950/30 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-sky-300 uppercase tracking-wider">
                    Single-Use Group Connection Command
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Expires in 15 minutes</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-lg">
                  <div className="font-mono text-sm sm:text-base font-bold text-white tracking-wide">
                    {telegramChallenge.command}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
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

                <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300">
                  {telegramChallenge.instructions.map((step, idx) => (
                    <li key={idx} className="leading-relaxed">{step}</li>
                  ))}
                </ol>
              </div>
            )}

            <div className="border-t border-slate-800 pt-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Required Telegram Bot Permissions
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 space-y-1">
                  <span className="font-bold text-white">Send Messages</span>
                  <p className="text-slate-400 text-[11px]">Responds to /requests, /tasks, /mytasks, and /passport inside group chat.</p>
                </div>
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 space-y-1">
                  <span className="font-bold text-white">Pin Messages</span>
                  <p className="text-slate-400 text-[11px]">Pins the interactive inline keyboard hub menu to the top of your Telegram group.</p>
                </div>
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 space-y-1">
                  <span className="font-bold text-white">Group Admin</span>
                  <p className="text-slate-400 text-[11px]">Required by Telegram Bot API so only genuine group admins can link a community.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Telegram Interactive Menu Publisher (Inside Telegram Hub!) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Pin className="h-4 w-4 text-amber-400" />
                  <span>{isRtl ? 'نشر وتثبيت القائمة التفاعلية في مجموعة تيلغرام' : 'Publish & Pin Interactive Menu in Telegram Group'}</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Sends an inline keyboard hub message directly to your connected Telegram group.
                </p>
                <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={pinTelegramMenu}
                    onChange={(e) => setPinTelegramMenu(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-sky-600 focus:ring-0"
                  />
                  <span>{isRtl ? 'تثبيت الرسالة في أعلى المجموعة' : 'Pin menu message to group header'}</span>
                </label>
              </div>
              <button
                type="button"
                onClick={handlePublishTelegramMenu}
                disabled={isPublishingTelegramMenu}
                className="flex items-center gap-2 rounded-lg bg-[#229ED9] px-4 py-2 text-xs font-bold text-white hover:bg-[#1e8ec3] transition-colors whitespace-nowrap disabled:opacity-50"
              >
                <Pin className="h-3.5 w-3.5" />
                <span>
                  {isPublishingTelegramMenu
                    ? isRtl ? 'جاري النشر...' : 'Publishing...'
                    : isRtl ? 'نشر القائمة في Telegram' : 'Publish Telegram Menu'}
                </span>
              </button>
            </div>
          </div>

          {/* Telegram Bot Commands Reference */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Terminal className="h-4 w-4 text-[#5dc5f7]" />
              <span>Telegram Bot Commands & Deep Links</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {[
                { cmd: '/start', desc: 'Open bot welcome hub & quick inline menu' },
                { cmd: '/connect CONNECT-TG-XXXX', desc: 'Admin command to link a Telegram group' },
                { cmd: '/connect OS-XXXX', desc: 'Member command to bind personal Telegram profile' },
                { cmd: '/hub', desc: 'Open direct Community Web Action Hub link' },
                { cmd: '/requests', desc: 'View open NeedSignal assistance requests' },
                { cmd: '/tasks', desc: 'List available QuestLoop tasks & bounties' },
                { cmd: '/mytasks', desc: 'Check tasks assigned to your linked account' },
                { cmd: '/passport', desc: 'View your verified skills & reputation passport' },
                { cmd: '/status', desc: 'Inspect Telegram bot sync & database connectivity' }
              ].map((c) => (
                <div key={c.cmd} className="p-2.5 rounded-lg border border-slate-800/80 bg-slate-950/60 text-xs">
                  <span className="font-mono font-bold text-[#5dc5f7]">{c.cmd}</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
