'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { OutcomeRecord, Community, User, Language } from '@/lib/types';
import { isValidHttpUrl } from '@/lib/services/validation';
import {
  ShieldCheck,
  CheckCircle2,
  Share2,
  ExternalLink,
  ArrowLeft,
  Users,
  Calendar,
  Globe,
  Lock
} from 'lucide-react';

export default function PublicOutcomePage() {
  const params = useParams();
  const router = useRouter();
  const outcomeId = params?.outcomeId as string;

  const [lang, setLang] = useState<Language>('en');
  const [viewer, setViewer] = useState<User | null>(null);
  const [outcome, setOutcome] = useState<OutcomeRecord | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [contributors, setContributors] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const isRtl = lang === 'ar';

  useEffect(() => {
    if (!outcomeId) return;

    const fetchOutcome = async () => {
      try {
        const res = await fetch('/api/data?communityId=all', { credentials: 'include', cache: 'no-store' });
        const json = (await res.json()) as any;
        if (json.success && json.data) {
          setViewer(json.data.authUser || null);
          const found = (json.data.outcomes || []).find((o: OutcomeRecord) => o.id === outcomeId);
          if (found) {
            setOutcome(found);
            const comm = (json.data.communities || []).find((c: Community) => c.id === found.communityId);
            setCommunity(comm || null);
            const contribUsers = (json.data.users || []).filter(
              (u: User) =>
                (found.participatingMemberIds || []).includes(u.id) &&
                u.passport?.isPublic !== false &&
                u.privacy?.allowDiscovery !== false
            );
            setContributors(contribUsers);
          }
        }
      } catch (err) {
        console.error('Failed to load outcome:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOutcome();
  }, [outcomeId]);

  const handleShare = async () => {
    try {
      if (typeof window !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      console.warn('[PublicOutcome] Clipboard unavailable:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center">
        <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
          <span>{isRtl ? 'جاري التحقق من شهادة النتيجة...' : 'Verifying Public Community Outcome...'}</span>
        </div>
      </div>
    );
  }

  const isAuthorizedForPrivate = Boolean(
    viewer &&
      outcome &&
      (viewer.platformRole === 'platform_admin' ||
        community?.ownerId === viewer.id ||
        outcome.participatingMemberIds.includes(viewer.id))
  );

  if (!outcome || (outcome.shareable === false && !isAuthorizedForPrivate)) {
    return (
      <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-[#070b14] text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center space-y-4">
          <Lock className="mx-auto h-9 w-9 text-amber-400" />
          <h2 className="text-lg font-bold">
            {outcome ? (isRtl ? 'شهادة نتيجة خاصة' : 'Private Outcome Record') : (isRtl ? 'سجل النتيجة غير موجود' : 'Outcome Record Not Found')}
          </h2>
          <p className="text-xs text-slate-400">
            {outcome
              ? isRtl
                ? 'تم تقييد المشاركة العامة لهذا السجل.'
                : 'Public sharing for this outcome record has been disabled.'
              : isRtl
              ? 'هذا السجل غير موجود أو تم حذفه.'
              : 'This outcome record does not exist or has been removed.'}
          </p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            {isRtl ? 'العودة للمنصة' : 'Return to Community OS Hub'}
          </button>
        </div>
      </div>
    );
  }

  const safeEvidenceUrls = (outcome.evidenceUrls || []).filter((u) => isValidHttpUrl(u));

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-[#070b14] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 py-3 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{isRtl ? 'العودة للمنصة' : 'Community OS Hub'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLang((p) => (p === 'en' ? 'ar' : 'en'))}
              className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white"
            >
              <Globe className="h-3.5 w-3.5 text-indigo-400" />
              <span>{lang === 'en' ? 'العربية' : 'English'}</span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-all"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-mono">{isRtl ? 'تم النسخ!' : 'Copied Link!'}</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5 text-indigo-400" />
                  <span>{isRtl ? 'مشاركة النتيجة' : 'Share Outcome'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8 backdrop-blur-sm space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded">
                {isRtl ? 'نتيجة موثقة' : 'Verified Outcome'}
              </span>
              {community && <span className="text-xs font-mono text-slate-400">{community.name}</span>}
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{outcome.objective}</h1>
            <div className="flex items-center gap-4 text-xs text-slate-400 font-mono pt-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <span>{new Date(outcome.date).toLocaleDateString()}</span>
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="capitalize">{outcome.confirmationStatus} Deliverable</span>
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 space-y-2">
            <span className="text-[11px] font-mono uppercase font-bold text-slate-400">
              {isRtl ? 'النتيجة المسلمة' : 'Delivered Result'}
            </span>
            <p className="text-sm text-slate-200 leading-relaxed">{outcome.deliveredResult}</p>
          </div>

          {safeEvidenceUrls.length > 0 && (
            <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-950/20 space-y-2">
              <span className="text-[11px] font-mono uppercase font-bold text-indigo-300">
                {isRtl ? 'أدلة التحقق القابلة للمراجعة' : 'Verifiable Reproducible Evidence'}
              </span>
              <div className="space-y-1">
                {safeEvidenceUrls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-indigo-400 hover:underline break-all"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span>{url}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {contributors.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <span className="text-xs font-mono uppercase font-bold text-slate-400 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-indigo-400" />
                <span>
                  {isRtl ? `المساهمون المعتمدون (${contributors.length})` : `Verified Contributors (${contributors.length})`}
                </span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {contributors.map((c) => (
                  <Link
                    key={c.id}
                    href={`/p/${c.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950 hover:border-indigo-500/50 transition-all"
                  >
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center font-bold text-white text-sm">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{c.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {isRtl ? 'عرض الجواز الموثق' : 'View Verified Passport →'}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              {isRtl ? 'هل تريد المساهمة في نتائج مماثلة أو إطلاق مجتمعك؟' : 'Want to contribute to outcomes like this or start your own community?'}
            </div>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition-all text-center"
            >
              {isRtl ? 'انضم إلى Community OS' : 'Join Community OS'}
            </button>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-400 transition-colors font-mono">
          <ShieldCheck className="h-4 w-4 text-indigo-400" />
          <span>
            Powered by <span className="font-bold text-white">Community OS</span>
          </span>
        </Link>
      </footer>
    </div>
  );
}
