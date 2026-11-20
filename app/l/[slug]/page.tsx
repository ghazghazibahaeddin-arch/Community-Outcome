'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Appointment,
  Community,
  CommunityEvent,
  CommunityLink,
  Contribution,
  Dispute,
  ExpertProfile,
  KnowledgeArticle,
  Language,
  NeedSignalRequest,
  Offer,
  OutcomeRecord,
  PlanTask,
  Poll,
  User
} from '@/lib/types';
import { ActionLinkViews } from '@/components/ActionLinkViews';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Globe,
  Link2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserCheck
} from 'lucide-react';

interface LinkAccessResolution {
  found: boolean;
  allowed: boolean;
  requiresAuth?: boolean;
  reason?: string;
  statusCode: number;
  link?: CommunityLink;
  community?: Community | null;
}

export default function ActionLinkPage() {
  const params = useParams();
  const router = useRouter();
  const rawSlug = params?.slug;
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : (rawSlug as string) || '';

  const [lang, setLang] = useState<Language>('en');
  const [resolution, setResolution] = useState<LinkAccessResolution | null>(null);
  const [link, setLink] = useState<CommunityLink | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<NeedSignalRequest[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeArticle[]>([]);
  const [outcomes, setOutcomes] = useState<OutcomeRecord[]>([]);
  const [expertProfiles, setExpertProfiles] = useState<ExpertProfile[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const isRtl = lang === 'ar';
  const returnToUrl = `/l/${encodeURIComponent(slug)}`;

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 4500);
  }, []);

  const loadHubState = useCallback(
    async (silent = false, recordVisit = false) => {
      if (!slug) return;
      if (!silent) setIsSyncing(true);

      try {
        // 1. Server-side access check (revocation, expiration, maxUses, audience, role)
        const accessRes = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            action: 'resolve_action_link',
            payload: { slug }
          })
        });
        const accessJson = (await accessRes.json().catch(() => ({}))) as any;
        const resolvedAccess: LinkAccessResolution | null = accessJson?.resolution || null;

        if (!resolvedAccess) {
          setResolution({ found: false, allowed: false, statusCode: accessRes.status || 404, reason: 'not_found' });
          setLink(null);
          setCommunity(null);
          return;
        }

        setResolution(resolvedAccess);
        setLink(resolvedAccess.link || null);
        setCommunity(resolvedAccess.community || null);

        if (!resolvedAccess.allowed || !resolvedAccess.community || !resolvedAccess.link) {
          return;
        }

        const commId = resolvedAccess.community.id;
        const res = await fetch('/api/data?communityId=all', {
          credentials: 'include',
          cache: 'no-store'
        });
        const json = (await res.json()) as any;
        if (!json.success || !json.data) {
          setErrorMsg(json.error || 'Failed to load Community Hub state.');
          return;
        }

        const d = json.data;
        setAuthUser(d.authUser || null);
        setUsers(d.users || []);
        setCommunities(d.communities || []);
        setRequests((d.requests || []).filter((r: NeedSignalRequest) => r.communityId === commId));
        setOffers((d.offers || []).filter((o: Offer) => o.communityId === commId));
        setTasks((d.tasks || []).filter((t: PlanTask) => t.communityId === commId));
        setContributions((d.contributions || []).filter((c: Contribution) => c.communityId === commId));
        setDisputes((d.disputes || []).filter((disp: Dispute) => disp.communityId === commId));
        setEvents((d.events || []).filter((ev: CommunityEvent) => ev.communityId === commId));
        setPolls((d.polls || []).filter((p: Poll) => p.communityId === commId));
        setKnowledge((d.knowledge || []).filter((k: KnowledgeArticle) => k.communityId === commId));
        setOutcomes((d.outcomes || []).filter((o: OutcomeRecord) => o.communityId === commId));
        setExpertProfiles((d.expertProfiles || []).filter((ep: ExpertProfile) => ep.communityId === commId));
        setAppointments((d.appointments || []).filter((a: Appointment) => a.communityId === commId));

        if (recordVisit && !resolvedAccess.link.id.startsWith('virtual_hub_')) {
          fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              action: 'record_link_event',
              payload: { linkId: resolvedAccess.link.id, eventType: 'visit' }
            })
          }).catch((err) => console.warn('[ActionLink] Visit metric error:', err));
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Network error loading Action Hub.');
      } finally {
        setIsLoading(false);
        setIsSyncing(false);
      }
    },
    [slug]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      loadHubState(true, true);
    }, 0);
    return () => clearTimeout(timer);
  }, [loadHubState]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadHubState(true, false);
      }
    }, 12000);
    return () => clearInterval(interval);
  }, [loadHubState]);

  const handleAction = async (action: string, payload: Record<string, any>, successMsg: string): Promise<boolean> => {
    setErrorMsg(null);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, payload })
      });
      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok || !json.success) {
        setErrorMsg(json.error || (isRtl ? 'تعذر تنفيذ الإجراء.' : 'Action could not be completed.'));
        return false;
      }
      showToast(successMsg);
      await loadHubState(true, false);
      return true;
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error communicating with Community OS.');
      return false;
    }
  };

  const handleRecordCompletion = async () => {
    if (!link || link.id.startsWith('virtual_hub_')) return;
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'record_link_event',
          payload: { linkId: link.id, eventType: 'completion' }
        })
      });
      await loadHubState(true, false);
    } catch (err) {
      console.warn('[ActionLink] Completion metric warning:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090d16] text-white flex items-center justify-center">
        <div className="flex items-center gap-2.5 text-xs font-mono text-slate-400">
          <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
          <span>{isRtl ? 'جاري التحقق من رابط الإجراء...' : 'Verifying Community Action Link...'}</span>
        </div>
      </div>
    );
  }

  if (!resolution || !resolution.found || !resolution.allowed || !link || !community) {
    const reason = resolution?.reason || 'not_found';
    const needsLogin = resolution?.requiresAuth;
    return (
      <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-[#090d16] text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/75 p-6 text-center space-y-4">
          {needsLogin || reason === 'role_restricted' || reason === 'membership_required' ? (
            <Lock className="mx-auto h-9 w-9 text-amber-400" />
          ) : (
            <AlertTriangle className="mx-auto h-9 w-9 text-amber-400" />
          )}
          <h2 className="text-base font-bold">
            {needsLogin
              ? isRtl ? 'مطلوب تسجيل الدخول للوصول' : 'Sign In Required'
              : reason === 'membership_required'
              ? isRtl ? 'رابط مخصص لأعضاء المجتمع' : 'Members-Only Action Link'
              : reason === 'role_restricted'
              ? isRtl ? 'صلاحية مخصصة مطلوبة' : 'Role-Restricted Action Link'
              : reason === 'expired'
              ? isRtl ? 'انتهت صلاحية هذا الرابط' : 'Action Link Expired'
              : reason === 'max_uses_reached'
              ? isRtl ? 'بلغ الرابط الحد الأقصى للاستخدام' : 'Maximum Uses Reached'
              : isRtl ? 'الرابط غير نشط أو ملغى' : 'Link Inactive or Revoked'}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {needsLogin
              ? isRtl
                ? 'سجل الدخول وسنعيدك تلقائياً إلى هذا الرابط لإكمال الإجراء.'
                : 'Sign in with your account and you will return automatically to this exact action link.'
              : reason === 'membership_required'
              ? isRtl
                ? 'هذا الرابط متاح فقط لأعضاء المجتمع المعتمدين.'
                : 'Access is restricted to verified members of this community.'
              : reason === 'role_restricted'
              ? isRtl
                ? 'يتطلب هذا الرابط دوراً إدارياً أو مراجعاً معتمداً داخل المجتمع.'
                : 'This link is restricted to authorized community roles.'
              : isRtl
              ? 'انتهت صلاحية هذا الرابط أو قام مالك المجتمع بإلغائه.'
              : 'This action link has expired, reached its usage cap, or was revoked by the community owner.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {needsLogin ? (
              <Link
                href={`/auth/login?returnTo=${encodeURIComponent(returnToUrl)}`}
                className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                {isRtl ? 'تسجيل الدخول والمتابعة' : 'Sign In & Continue'}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => router.push('/')}
              className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              {isRtl ? 'العودة للمنصة الرئيسية' : 'Return to Community OS Hub'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between p-4 sm:p-6">
      <div className="max-w-3xl mx-auto w-full space-y-4">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{isRtl ? `مساحة العمل (${community.name})` : `Open Full Workspace (${community.name})`}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLang((p) => (p === 'en' ? 'ar' : 'en'))}
              className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white"
            >
              <Globe className="h-3 w-3 text-indigo-400" />
              <span>{lang === 'en' ? 'العربية' : 'English'}</span>
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
              <Sparkles className="h-3 w-3" />
              <span>{isRtl ? 'متزامن مباشرة' : 'Telegram · Discord · Web Synced'}</span>
            </span>
            <button
              type="button"
              onClick={() => loadHubState(false, false)}
              disabled={isSyncing}
              className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white"
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
              <span>{isRtl ? 'تحديث' : 'Sync'}</span>
            </button>
          </div>
        </div>

        {/* Alerts */}
        {toastMsg && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/50 px-3.5 py-2.5 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3.5 py-2.5 text-xs text-rose-200">
            {errorMsg}
          </div>
        )}

        {/* Main Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-7 shadow-2xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-indigo-300">{community.name}</span>
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                    {link.linkType}
                  </span>
                </div>
                <h1 className="text-base sm:text-lg font-bold text-white leading-tight">{link.title}</h1>
              </div>
            </div>

            {authUser ? (
              <div className="inline-flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-800/70 px-3 py-1.5 text-xs">
                <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-slate-200 font-medium">{authUser.name}</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/api/auth/telegram/authorize?redirect=true&returnTo=${encodeURIComponent(returnToUrl)}`}
                  target="_top"
                  className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  <span>{isRtl ? 'دخول تيلغرام' : 'Telegram'}</span>
                </a>
                <a
                  href={`/api/discord/connect?mode=user&redirect=true&returnTo=${encodeURIComponent(returnToUrl)}`}
                  target="_top"
                  className="inline-flex items-center gap-1.5 rounded-md border border-indigo-500/40 bg-indigo-600/20 px-3 py-1.5 text-xs font-semibold text-indigo-200 hover:bg-indigo-600/30"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>{isRtl ? 'ديسكورد' : 'Discord'}</span>
                </a>
                <Link
                  href={`/auth/login?returnTo=${encodeURIComponent(returnToUrl)}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white"
                >
                  <span>{isRtl ? 'البريد' : 'Email'}</span>
                </Link>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">{link.description}</p>

          <ActionLinkViews
            link={link}
            community={community}
            communities={communities}
            authUser={authUser}
            users={users}
            requests={requests}
            offers={offers}
            tasks={tasks}
            contributions={contributions}
            disputes={disputes}
            events={events}
            polls={polls}
            knowledge={knowledge}
            outcomes={outcomes}
            expertProfiles={expertProfiles}
            appointments={appointments}
            lang={lang}
            returnToUrl={returnToUrl}
            onAction={handleAction}
            onRecordCompletion={handleRecordCompletion}
          />

          <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
            <span>Action URL: /l/{link.slug}</span>
            <span>
              {link.stats.visits} {isRtl ? 'زيارة' : 'visits'} · {link.stats.submissions} {isRtl ? 'إرسالات' : 'responses'} ·{' '}
              {link.stats.completions} {isRtl ? 'إنجاز' : 'completions'}
            </span>
          </div>
        </div>
      </div>

      <footer className="text-center py-5">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-400 font-mono">
          <ShieldCheck className="h-4 w-4 text-indigo-400" />
          <span>
            Powered by <span className="font-bold text-slate-300">Community OS</span>
          </span>
        </Link>
      </footer>
    </div>
  );
}
