'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { User, Contribution, OutcomeRecord, Language } from '@/lib/types';
import { isValidHttpUrl } from '@/lib/services/validation';
import {
  ShieldCheck,
  CheckCircle2,
  Award,
  Globe,
  Share2,
  ExternalLink,
  Lock,
  ArrowLeft,
  Sparkles
} from 'lucide-react';

export default function PublicPassportPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId as string;

  const [lang, setLang] = useState<Language>('en');
  const [viewer, setViewer] = useState<User | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [outcomes, setOutcomes] = useState<OutcomeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const isRtl = lang === 'ar';

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/data?communityId=all', { credentials: 'include', cache: 'no-store' });
        const json = (await res.json()) as any;
        if (json.success && json.data) {
          setViewer(json.data.authUser || null);
          const found = (json.data.users || []).find((u: User) => u.id === userId);
          if (found) {
            setUser(found);
            const userContributions = (json.data.contributions || []).filter(
              (c: Contribution) => c.memberId === userId && c.reviewStatus === 'verified'
            );
            const userOutcomes = (json.data.outcomes || []).filter(
              (o: OutcomeRecord) => o.shareable !== false && (o.participatingMemberIds || []).includes(userId)
            );
            setContributions(userContributions);
            setOutcomes(userOutcomes);
          }
        }
      } catch (err) {
        console.error('Failed to load public passport:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const handleShare = async () => {
    try {
      if (typeof window !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      console.warn('[PublicPassport] Clipboard unavailable:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090d16] text-white flex items-center justify-center">
        <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
          <span>{isRtl ? 'جاري التحقق من جواز السفر...' : 'Verifying Public Member Passport...'}</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-[#090d16] text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center space-y-4">
          <Lock className="mx-auto h-10 w-10 text-slate-500" />
          <h2 className="text-lg font-bold">{isRtl ? 'جواز السفر غير موجود' : 'Passport Not Found'}</h2>
          <p className="text-xs text-slate-400">
            {isRtl ? 'هذا السجل غير موجود أو تم إغلاقه.' : 'This member passport does not exist or has been made private by its owner.'}
          </p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            {isRtl ? 'العودة للمنصة' : 'Go to Community OS Hub'}
          </button>
        </div>
      </div>
    );
  }

  const passport = user.passport;
  const privacy = user.privacy;
  const isOwnerViewer = viewer?.id === user.id || viewer?.platformRole === 'platform_admin';
  const isPublicVisible = passport.isPublic !== false && privacy?.allowDiscovery !== false;

  if (!isPublicVisible && !isOwnerViewer) {
    return (
      <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-[#090d16] text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center space-y-4">
          <Lock className="mx-auto h-10 w-10 text-amber-400" />
          <h2 className="text-lg font-bold">{isRtl ? 'جواز سفر خاص' : 'Private Member Passport'}</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isRtl
              ? 'وفقاً لإعدادات الخصوصية، قام مالك هذا الجواز بتقييد العرض العام أو الاكتشاف.'
              : 'In compliance with member privacy preferences, public discovery for this passport has been disabled by its owner.'}
          </p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            {isRtl ? 'العودة للمنصة' : 'Return to Public Hub'}
          </button>
        </div>
      </div>
    );
  }

  const displayedSkills = passport.skills.filter((s) => !privacy?.showVerifiedOnly || s.verified);

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
                  <span>{isRtl ? 'مشاركة الجواز' : 'Share Passport'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {!isPublicVisible && isOwnerViewer && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-2.5 text-xs text-amber-200 flex items-center gap-2">
            <Lock className="h-4 w-4 shrink-0" />
            <span>
              {isRtl
                ? 'وضع المعاينة الخاصة: هذا الجواز مخفي عن الزوار الآخرين حسب إعدادات الخصوصية.'
                : 'Private Preview: Your privacy settings currently hide this passport from external visitors.'}
            </span>
          </div>
        )}

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8 backdrop-blur-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-indigo-950/50">
                {user.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-white tracking-tight">{passport.displayName || user.name}</h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
                    <ShieldCheck className="h-3 w-3" />
                    <span>{isRtl ? 'هوية موثقة' : 'Verified Identity'}</span>
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  {isRtl ? 'عضو منذ' : 'Member since'} {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-mono">
              {user.identities?.discordUsername && (
                <span className="rounded-md bg-[#5865F2]/10 border border-[#5865F2]/30 px-2.5 py-1 text-[#8ea1ff]">
                  Discord: @{user.identities.discordUsername}
                </span>
              )}
              {user.identities?.telegramUsername && (
                <span className="rounded-md bg-[#229ED9]/10 border border-[#229ED9]/30 px-2.5 py-1 text-[#54bbf0]">
                  Telegram: @{user.identities.telegramUsername}
                </span>
              )}
            </div>
          </div>

          {privacy?.showBio && passport.biography && (
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">{passport.biography}</p>
          )}

          {privacy?.showSkills && displayedSkills.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <span className="text-[11px] font-mono uppercase font-bold text-slate-400">
                {isRtl ? 'المهارات الموثقة والتزكيات' : 'Verified Skills & Endorsements'}
              </span>
              <div className="flex flex-wrap gap-2">
                {displayedSkills.map((skill, idx) => (
                  <span
                    key={idx}
                    className={`text-xs px-2.5 py-1 rounded-md border flex items-center gap-1.5 ${
                      skill.verified
                        ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    {skill.verified && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                    <span>{skill.name}</span>
                    {skill.endorsementsCount && skill.endorsementsCount > 0 && (
                      <span className="text-[10px] text-indigo-400 font-mono">({skill.endorsementsCount}★)</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="h-4 w-4 text-indigo-400" />
              <span>
                {isRtl ? `سجل المساهمات المعتمدة (${contributions.length})` : `Verified Contribution Ledger (${contributions.length})`}
              </span>
            </h2>
            <span className="text-[11px] font-mono text-emerald-400">{isRtl ? 'موثق بالمراجعة' : 'Peer-Reviewed'}</span>
          </div>

          {contributions.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono py-2">
              {isRtl ? 'لا توجد مساهمات عامة موثقة بعد.' : 'No public verified contributions yet.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {contributions.map((c) => {
                const safeEvidenceUrl = c.evidence?.[0]?.url && isValidHttpUrl(c.evidence[0].url) ? c.evidence[0].url : null;
                return (
                  <div key={c.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">{c.title}</span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        {isRtl ? 'معتمد' : 'Verified'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{c.description}</p>
                    {safeEvidenceUrl && (
                      <a
                        href={safeEvidenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono pt-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>{isRtl ? 'عرض الدليل الموثق' : 'View Verified Evidence'}</span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {outcomes.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>
                {isRtl ? `النتائج المجتمعية الموثقة (${outcomes.length})` : `Produced Community Outcomes (${outcomes.length})`}
              </span>
            </h2>
            <div className="space-y-3">
              {outcomes.map((o) => (
                <div key={o.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Link href={`/outcome/${o.id}`} className="text-xs font-bold text-white hover:text-indigo-300">
                      {o.objective}
                    </Link>
                    <span className="text-[10px] font-mono text-slate-400">{new Date(o.date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-slate-300">{o.deliveredResult}</p>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-indigo-400">
                    <ShieldCheck className="h-3 w-3 text-emerald-400" />
                    <span className="capitalize">{o.confirmationStatus}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
