'use client';

import React, { useState } from 'react';
import { translations } from '@/lib/i18n';
import { CommunityLink, LinkType, Community, User, Language } from '@/lib/types';
import { Link2, ExternalLink, Plus, Copy, Check, Ban, Eye, BarChart3, ShieldAlert } from 'lucide-react';

interface LinkManagerSectionProps {
  links: CommunityLink[];
  community: Community;
  currentUser: User;
  lang: Language;
  onRefresh: () => void;
}

const ALL_LINK_TYPES: { type: LinkType; label: string; desc: string }[] = [
  { type: 'hub_multipurpose', label: 'Main Community Hub Link (ALT-6)', desc: 'Multipurpose role-aware routing link for members and visitors.' },
  { type: 'link_1_ranking', label: 'Link-1: Valuable Contribution Ranking', desc: 'Transparent view of configured contribution categories and rankings.' },
  { type: 'link_3_thanks', label: 'Link-3: Contribution-Linked Thanks', desc: 'Thank contributors for specific verified outcomes without cash.' },
  { type: 'link_4_confirmable', label: 'Link-4: Confirmable Contribution Record', desc: 'Dual-party confirmation link with evidence audit.' },
  { type: 'link_5_portable_card', label: 'Link-5: Portable Contributor Card', desc: 'Share an individual contribution between communities.' },
  { type: 'link_6_owner_dashboard', label: 'Link-6: Owner Dashboard Link', desc: 'Authorized administrative link for community managers.' },
  { type: 'link_7_bounties', label: 'Link-7: Community Bounties', desc: 'Non-monetary challenge opportunities with recognition.' },
  { type: 'link_8_approval_rules', label: 'Link-8: Approval and Dispute Rules', desc: 'Transparent review criteria, permissions and appeal paths.' },
  { type: 'link_9_help_request', label: 'Link-9: Short Help Request Form', desc: 'Direct form to submit structured NeedSignal requests.' },
  { type: 'link_10_service_offer', label: 'Link-10: Skill or Service Offer Card', desc: 'Present available skills and volunteer offers.' },
  { type: 'link_11_booking', label: 'Link-11: Lightweight Appointment Booking', desc: 'Consultation slot scheduling without payments.' },
  { type: 'link_12_rsvp', label: 'Link-12: Community Event RSVP', desc: 'Register attendance intentions for community events.' },
  { type: 'link_13_checklist', label: 'Link-13: Execution Checklist', desc: 'Trackable milestone checklist for plan participants.' },
  { type: 'link_14_evidence', label: 'Link-14: Contribution Evidence Submission', desc: 'Direct link to submit verifiable deliverable proofs.' },
  { type: 'link_15_decision', label: 'Link-15: Contribution Decision', desc: 'Reviewer-only link to approve or reject submissions.' },
  { type: 'link_16_knowledge_source', label: 'Link-16: Trusted Knowledge Source Card', desc: 'Verified answer or recommendation with primary citations.' },
  { type: 'link_17_onboarding', label: 'Link-17: Role-Based Onboarding Link', desc: 'Direct journey selector for new members, experts, or moderators.' },
  { type: 'link_18_task_card', label: 'Link-18: Task or Bounty Card', desc: 'Shareable card with task acceptance criteria.' },
  { type: 'link_19_status_update', label: 'Link-19: Manual Request Status Update', desc: 'Unified single-page status updater for requests.' },
  { type: 'link_20_multi_community', label: 'Link-20: Multi-Community Help Request', desc: 'Partner-network help sharing link.' },
  { type: 'link_21_attendance', label: 'Link-21: Attendance or Activity Confirmation', desc: 'Independent confirmation of actual event participation.' },
  { type: 'link_22_single_contribution', label: 'Link-22: Single Contribution Public Card', desc: 'Shareable card for one authorized deliverable.' },
  { type: 'link_23_referral', label: 'Link-23: Referral Attribution', desc: 'Attributed community invitation with conversion tracking.' },
  { type: 'link_24_issue_report', label: 'Link-24: Issue Reporting', desc: 'Report an issue with community resources or tasks.' },
  { type: 'link_25_audience_expiry', label: 'Link-25: Link Audience and Expiration', desc: 'Time-limited, role-restricted secure link.' },
  { type: 'link_26_outcome_report', label: 'Link-26: Owner Outcome Report', desc: 'Concise executive summary of results produced via links.' }
];

export const LinkManagerSection: React.FC<LinkManagerSectionProps> = ({
  links,
  community,
  currentUser,
  lang,
  onRefresh
}) => {
  const t = translations[lang];

  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Link Form
  const [selectedType, setSelectedType] = useState<LinkType>('link_9_help_request');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkDesc, setLinkDesc] = useState('');
  const [linkSlug, setLinkSlug] = useState('');
  const [linkAudience, setLinkAudience] = useState<CommunityLink['audience']>('public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkTitle.trim() || !linkSlug.trim()) return;
    setFeedback(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'create_link',
          payload: {
            communityId: community.id,
            linkType: selectedType,
            slug: linkSlug.toLowerCase().replace(/\s+/g, '-'),
            title: linkTitle,
            description: linkDesc,
            audience: linkAudience
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', text: data.error || 'Failed to create action link.' });
        return;
      }
      setIsCreatingLink(false);
      setLinkTitle('');
      setLinkDesc('');
      setLinkSlug('');
      setFeedback({ type: 'success', text: `Action link /l/${data.result?.slug || ''} created cleanly.` });
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Network error creating action link.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (linkId: string) => {
    setFeedback(null);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'revoke_link',
          payload: { linkId }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', text: data.error || 'Failed to revoke action link.' });
        return;
      }
      setFeedback({ type: 'success', text: 'Action link revoked.' });
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Network error revoking link.' });
    }
  };

  const handleCopy = async (slug: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://community-outcome.ghazghazibahaeddin.workers.dev';
    const url = `${origin}/l/${slug}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopiedSlug(slug);
        setTimeout(() => setCopiedSlug(null), 2500);
      } else {
        setFeedback({ type: 'error', text: `Copy URL manually: ${url}` });
      }
    } catch {
      setFeedback({ type: 'error', text: `Clipboard restricted. Share URL: ${url}` });
    }
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`rounded-xl border p-3 text-xs flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
              : 'border-rose-500/40 bg-rose-950/40 text-rose-300'
          }`}
        >
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white px-1">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white">
            {t.links.title}
          </h2>
          <p className="text-xs text-slate-400">
            {t.links.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreatingLink(true)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t.links.createLink}</span>
        </button>
      </div>

      {/* Create Link Drawer */}
      {isCreatingLink && (
        <form onSubmit={handleCreateLink} className="rounded-xl border border-slate-700 bg-slate-800/60 p-5 space-y-4">
          <h4 className="text-xs font-bold text-white">
            Configure New Community Action URL
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Link Concept</label>
              <select
                value={selectedType}
                onChange={(e) => {
                  const tType = e.target.value as LinkType;
                  setSelectedType(tType);
                  const found = ALL_LINK_TYPES.find((l) => l.type === tType);
                  if (found) {
                    setLinkTitle(found.label);
                    setLinkDesc(found.desc);
                    setLinkSlug(found.type.replace(/_/g, '-'));
                  }
                }}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
              >
                {ALL_LINK_TYPES.map((l) => (
                  <option key={l.type} value={l.type}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Audience Scope</label>
              <select
                value={linkAudience}
                onChange={(e) => setLinkAudience(e.target.value as any)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white capitalize"
              >
                <option value="public">Public (Anyone with link)</option>
                <option value="members_only">Members Only</option>
                <option value="role_restricted">Role Restricted (Reviewer/Admin)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Link Title</label>
              <input
                type="text"
                required
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="e.g. Volunteer Assistance Form"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
              >
              </input>
            </div>
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Custom Slug (Action Path)</label>
              <div className="flex items-center">
                <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1.5 border border-r-0 border-slate-700 rounded-l-md font-mono">
                  /l/
                </span>
                <input
                  type="text"
                  required
                  value={linkSlug}
                  onChange={(e) => setLinkSlug(e.target.value)}
                  placeholder="volunteer-form"
                  className="w-full rounded-r-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-300 block mb-1">Description</label>
            <input
              type="text"
              value={linkDesc}
              onChange={(e) => setLinkDesc(e.target.value)}
              placeholder="Context displayed when link is shared in Discord or Telegram embed"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreatingLink(false)}
              className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Generating...' : 'Generate Link'}
            </button>
          </div>
        </form>
      )}

      {/* Link Inventory & Metric Tracking */}
      <div className="space-y-3">
        {links.map((link) => {
          const typeDef = ALL_LINK_TYPES.find((t) => t.type === link.linkType);
          const isCopied = copiedSlug === link.slug;
          return (
            <div
              key={link.id}
              className={`rounded-xl border p-4 transition-all ${
                link.isRevoked
                  ? 'border-slate-800/50 bg-slate-950/40 opacity-60'
                  : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">
                      {link.title}
                    </h3>
                    <span className="text-xs text-slate-500 font-mono">
                      /l/{link.slug}
                    </span>
                    {link.isRevoked && (
                      <span className="text-[10px] font-mono text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded">
                        Revoked
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {link.description || typeDef?.desc}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopy(link.slug)}
                    className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 hover:text-white transition-colors"
                  >
                    {isCopied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{isCopied ? 'Copied' : 'Copy Action URL'}</span>
                  </button>

                  {!link.isRevoked && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(link.id)}
                      title="Revoke Link"
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-800 bg-slate-900 text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Real Metric Funnel Tracker (Visits -> Starts -> Submissions -> Outcomes) */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3 border-t border-slate-800/80 text-xs">
                <div className="p-2 rounded bg-slate-950/40">
                  <span className="text-[10px] text-slate-500 uppercase block">{t.links.visits}</span>
                  <span className="text-sm font-bold font-mono text-white tabular-nums">{link.stats.visits}</span>
                </div>
                <div className="p-2 rounded bg-slate-950/40">
                  <span className="text-[10px] text-slate-500 uppercase block">{t.links.starts}</span>
                  <span className="text-sm font-bold font-mono text-slate-300 tabular-nums">{link.stats.starts}</span>
                </div>
                <div className="p-2 rounded bg-slate-950/40">
                  <span className="text-[10px] text-slate-500 uppercase block">{t.links.submissions}</span>
                  <span className="text-sm font-bold font-mono text-indigo-400 tabular-nums">{link.stats.submissions}</span>
                </div>
                <div className="p-2 rounded bg-slate-950/40">
                  <span className="text-[10px] text-slate-500 uppercase block">{t.common.completed}</span>
                  <span className="text-sm font-bold font-mono text-sky-400 tabular-nums">{link.stats.completions}</span>
                </div>
                <div className="col-span-2 sm:col-span-1 p-2 rounded bg-slate-950/40">
                  <span className="text-[10px] text-slate-500 uppercase block">{t.links.verifiedOutcomes}</span>
                  <span className="text-sm font-bold font-mono text-emerald-400 tabular-nums">{link.stats.verifiedOutcomes}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
