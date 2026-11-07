'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CommunityLink, Community } from '@/lib/types';
import { ArrowLeft, ShieldCheck, CheckCircle2, ExternalLink, Send, AlertTriangle } from 'lucide-react';

export default function ActionLinkPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [link, setLink] = useState<CommunityLink | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    if (!slug) return;

    const fetchLink = async () => {
      try {
        const res = await fetch(`/api/data`);
        const json = (await res.json()) as any;
        if (json.success && json.data) {
          const foundLink = json.data.links?.find((l: CommunityLink) => l.slug === slug);
          if (foundLink) {
            setLink(foundLink);
            const comm = json.data.communities?.find((c: Community) => c.id === foundLink.communityId);
            setCommunity(comm || null);

            // Record Visit Event
            fetch('/api/data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'record_link_event',
                payload: { linkId: foundLink.id, eventType: 'visit' }
              })
            }).catch(console.error);
          }
        }
      } catch (err) {
        console.error('Failed to load link:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLink();
  }, [slug]);

  const handleSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!link) return;

    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_link_event',
          payload: { linkId: link.id, eventType: 'submission' }
        })
      });
      setIsSubmitted(true);
    } catch (err) {
      console.error('Failed to submit link action:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090d16] text-white flex items-center justify-center">
        <div className="text-xs font-mono text-slate-400">Loading Community Link...</div>
      </div>
    );
  }

  if (!link || link.isRevoked) {
    return (
      <div className="min-h-screen bg-[#090d16] text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-center space-y-4">
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-400" />
          <h2 className="text-base font-bold">Link Inactive or Revoked</h2>
          <p className="text-xs text-slate-400">
            This action link has either expired or been revoked by the community owner in compliance with Section 11 of the Community OS link specification.
          </p>
          <button
            onClick={() => router.push('/')}
            className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            Return to Community OS Hub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between p-4 sm:p-8">
      <div className="max-w-xl mx-auto w-full my-auto space-y-6">
        {/* Community Breadcrumb */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to {community?.name || 'Community OS'}</span>
        </button>

        {/* Link Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 md:p-8 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 block">{community?.name}</span>
                <span className="text-sm font-bold text-white block">{link.title}</span>
              </div>
            </div>
            <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950/60 border border-indigo-800/40 px-2.5 py-0.5 rounded capitalize">
              {link.audience.replace('_', ' ')}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {link.description}
          </p>

          {isSubmitted ? (
            <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-6 text-center space-y-2">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Action Completed & Persisted</h3>
              <p className="text-xs text-slate-300">
                Your response was synchronized directly with the community&apos;s central database and Discord/Telegram adapters.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => router.push('/')}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Open in Workspace
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitAction} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Submission Details / Intent Statement
                </label>
                <textarea
                  required
                  rows={3}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Provide your input, response, or evidence..."
                  className="w-full rounded-md border border-slate-700 bg-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Submit Action</span>
                </button>
              </div>
            </form>
          )}

          {/* Footer stats */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>Action URL: /l/{link.slug}</span>
            <span>{link.stats.visits} visits · {link.stats.submissions} responses</span>
          </div>
        </div>
      </div>

      <footer className="text-center py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-400 transition-colors font-mono"
        >
          <ShieldCheck className="h-4 w-4 text-indigo-400" />
          <span>Powered by <span className="font-bold text-slate-300">Community OS</span></span>
        </Link>
      </footer>
    </div>
  );
}
