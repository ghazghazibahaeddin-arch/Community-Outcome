'use client';

import React, { useState, useEffect } from 'react';
import { translations } from '@/lib/i18n';
import { NeedSignalRequest, Offer, Community, Language, User } from '@/lib/types';
import { Plus, Clock, AlertCircle, CheckCircle, Send, Globe, ChevronRight } from 'lucide-react';

interface NeedSignalSectionProps {
  requests: NeedSignalRequest[];
  offers: Offer[];
  community: Community;
  currentUser: User;
  lang: Language;
  onRefresh: () => void;
  onRequestCreated: (req: any) => void;
}

export const NeedSignalSection: React.FC<NeedSignalSectionProps> = ({
  requests,
  offers,
  community,
  currentUser,
  lang,
  onRefresh,
  onRequestCreated
}) => {
  const t = translations[lang];

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(requests[0]?.id || null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSubmittingOffer, setIsSubmittingOffer] = useState<boolean>(false);
  const [isCreatingRequest, setIsCreatingRequest] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Request Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState(community.contributionCategories[0]?.id || 'cat_tech');
  const [newSkills, setNewSkills] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newCrossCommunity, setNewCrossCommunity] = useState(false);

  // Offer Form State
  const [offerHelp, setOfferHelp] = useState('');
  const [offerSkills, setOfferSkills] = useState('');
  const [offerAvailability, setOfferAvailability] = useState('Weekdays (10 hrs/week)');
  const [offerHours, setOfferHours] = useState('8');

  useEffect(() => {
    const timer = setTimeout(() => {
      setNewCategory(community.contributionCategories[0]?.id || 'cat_tech');
      setSelectedRequestId((prev) =>
        prev && requests.some((r) => r.id === prev) ? prev : (requests[0]?.id || null)
      );
      setFeedback(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [community.id, community.contributionCategories, requests]);

  const effectiveSelectedId =
    selectedRequestId && requests.some((r) => r.id === selectedRequestId)
      ? selectedRequestId
      : (requests[0]?.id || null);

  const selectedRequest = requests.find((r) => r.id === effectiveSelectedId);
  const selectedRequestOffers = offers.filter((o) => o.requestId === effectiveSelectedId);
  const canAcceptOffers = Boolean(
    selectedRequest &&
      (currentUser.id === selectedRequest.creatorId ||
        currentUser.id === community.ownerId ||
        currentUser.platformRole === 'platform_admin')
  );

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.skillsRequired.some((s) => s.toLowerCase().includes(q));
    return matchesStatus && matchesQuery;
  });

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setFeedback(null);

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'create_request',
          payload: {
            communityId: community.id,
            creatorId: currentUser.id,
            title: newTitle,
            description: newDesc,
            category: newCategory,
            skillsRequired: newSkills.split(',').map((s) => s.trim()).filter(Boolean),
            priority: newPriority,
            deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
            status: 'open',
            visibility: newCrossCommunity ? 'cross_community' : 'community',
            allowedCommunityIds: newCrossCommunity ? [community.id, 'comm_aicreators', 'comm_devforge', 'comm_civic'] : [community.id]
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', text: data.error || 'Failed to create help request.' });
        return;
      }
      setIsCreatingRequest(false);
      setNewTitle('');
      setNewDesc('');
      setNewSkills('');
      setFeedback({ type: 'success', text: 'Help request published cleanly.' });
      onRequestCreated(data.result);
      setSelectedRequestId(data.result.id);
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Network error creating request.' });
    }
  };

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveSelectedId || !offerHelp.trim()) return;
    setFeedback(null);

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'submit_offer',
          payload: {
            requestId: effectiveSelectedId,
            communityId: community.id,
            memberId: currentUser.id,
            proposedHelp: offerHelp,
            skills: offerSkills.split(',').map((s) => s.trim()).filter(Boolean),
            experienceDescription: 'Verified member submission through NeedSignal interface.',
            availability: offerAvailability,
            estimatedHours: parseInt(offerHours, 10) || 4,
            portfolioLinks: currentUser.passport.portfolioLinks
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', text: data.error || 'Failed to submit assistance offer.' });
        return;
      }
      setIsSubmittingOffer(false);
      setOfferHelp('');
      setFeedback({ type: 'success', text: 'Offer submitted cleanly.' });
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Network error submitting offer.' });
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    setFeedback(null);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'accept_offer',
          payload: { offerId }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', text: data.error || 'Failed to accept offer.' });
        return;
      }
      setFeedback({ type: 'success', text: 'Offer accepted and QuestLoop task created!' });
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Network error accepting offer.' });
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

      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white">
            {t.needSignal.title}
          </h2>
          <p className="text-xs text-slate-400">
            {t.needSignal.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'ar' ? 'بحث في الطلبات...' : 'Search requests...'}
            className="h-8 rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
          {/* Segmented Filter */}
          <div className="flex flex-wrap rounded-lg border border-slate-800 bg-slate-900/90 p-0.5 text-xs">
            {['all', 'open', 'receiving_offers', 'in_progress', 'completed'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded-md font-medium capitalize transition-colors whitespace-nowrap ${
                  filterStatus === st ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsCreatingRequest(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t.needSignal.newRequest}</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Split: Requests List & Selected Request Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Request Cards (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          {filteredRequests.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-8 text-center text-xs text-slate-400">
              {t.common.empty}
            </div>
          ) : (
            filteredRequests.map((req) => {
              const reqOffers = offers.filter((o) => o.requestId === req.id);
              const isSelected = req.id === effectiveSelectedId;
              return (
                <div
                  key={req.id}
                  onClick={() => setSelectedRequestId(req.id)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/20 shadow-sm'
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-white line-clamp-1">
                      {req.title}
                    </h3>
                    <span
                      className={`text-[11px] font-mono capitalize px-2 py-0.5 rounded ${
                        req.priority === 'urgent'
                          ? 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                          : req.priority === 'high'
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {req.priority}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {req.description}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                    <span className="capitalize text-slate-300">
                      Status: {req.status.replace('_', ' ')}
                    </span>
                    <span className="font-mono text-indigo-400">
                      {reqOffers.length} {t.needSignal.offersCount}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Selected Request Detail & Match & Offer (7 Cols) */}
        <div className="lg:col-span-7">
          {selectedRequest ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-6">
              {/* Header */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-white">
                    {selectedRequest.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    {selectedRequest.visibility === 'cross_community' && (
                      <span className="flex items-center gap-1 text-[11px] text-sky-400 bg-sky-950/50 border border-sky-800/40 px-2 py-0.5 rounded">
                        <Globe className="h-3 w-3" />
                        <span>Cross-Community</span>
                      </span>
                    )}
                    <span className="text-xs font-mono capitalize text-indigo-400 bg-indigo-950/40 border border-indigo-800/40 px-2.5 py-0.5 rounded">
                      {selectedRequest.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                  {selectedRequest.description}
                </p>

                {/* Metadata row */}
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                    <span>Deadline: {new Date(selectedRequest.deadline).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-slate-500" />
                    <span className="capitalize">Priority: {selectedRequest.priority}</span>
                  </div>
                  <div>
                    Skills: {selectedRequest.skillsRequired.join(', ')}
                  </div>
                </div>
              </div>

              {/* Assistance Offers on this request */}
              <div className="pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    {t.matchOffer.title} ({selectedRequestOffers.length})
                  </h4>
                  {selectedRequest.status !== 'completed' && (
                    <button
                      onClick={() => setIsSubmittingOffer(!isSubmittingOffer)}
                      className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      <span>{t.matchOffer.submitOffer}</span>
                    </button>
                  )}
                </div>

                {/* Offer form if toggled */}
                {isSubmittingOffer && (
                  <form onSubmit={handleSubmitOffer} className="mb-4 rounded-lg border border-slate-700 bg-slate-800/60 p-4 space-y-3">
                    <h5 className="text-xs font-semibold text-white">
                      {t.matchOffer.submitOffer}
                    </h5>
                    <div>
                      <label className="text-[11px] text-slate-300 block mb-1">
                        {t.matchOffer.proposedHelp}
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={offerHelp}
                        onChange={(e) => setOfferHelp(e.target.value)}
                        placeholder="Detail your approach and deliverables..."
                        className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-300 block mb-1">
                          {t.matchOffer.availability}
                        </label>
                        <input
                          type="text"
                          value={offerAvailability}
                          onChange={(e) => setOfferAvailability(e.target.value)}
                          className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-300 block mb-1">
                          {t.matchOffer.estimatedHours}
                        </label>
                        <input
                          type="number"
                          value={offerHours}
                          onChange={(e) => setOfferHours(e.target.value)}
                          className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsSubmittingOffer(false)}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        {t.common.cancel}
                      </button>
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                      >
                        <Send className="h-3 w-3" />
                        <span>{t.common.submit}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Offer list */}
                {selectedRequestOffers.length === 0 ? (
                  <div className="rounded-lg border border-slate-800/80 bg-slate-900/30 p-4 text-center text-xs text-slate-400">
                    {t.needSignal.noOffersYet}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedRequestOffers.map((off) => (
                      <div
                        key={off.id}
                        className={`rounded-lg border p-3.5 ${
                          off.status === 'accepted'
                            ? 'border-emerald-600/40 bg-emerald-950/20'
                            : 'border-slate-800 bg-slate-900/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-semibold text-white">
                              Offer from Member ({off.memberId})
                            </span>
                            <span className="text-xs text-slate-500 mx-2">·</span>
                            <span className="text-xs text-slate-400 font-mono">
                              ~{off.estimatedHours} hrs ({off.availability})
                            </span>
                          </div>
                          <span
                            className={`text-[11px] font-mono capitalize px-2 py-0.5 rounded ${
                              off.status === 'accepted'
                                ? 'bg-emerald-900/50 text-emerald-300'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {off.status}
                          </span>
                        </div>

                        <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                          {off.proposedHelp}
                        </p>

                        {off.status === 'pending' && selectedRequest.status !== 'in_progress' && (
                          <div className="mt-3 flex justify-end">
                            {canAcceptOffers ? (
                              <button
                                onClick={() => handleAcceptOffer(off.id)}
                                className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
                              >
                                <CheckCircle className="h-3 w-3" />
                                <span>{t.matchOffer.acceptOffer}</span>
                              </button>
                            ) : (
                              <span className="text-[11px] font-mono text-slate-400">
                                {lang === 'ar' ? 'بانتظار موافقة صاحب الطلب أو المالك' : 'Awaiting requester/owner approval'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-12 text-center text-xs text-slate-400">
              Select a request from the list to view offers and details.
            </div>
          )}
        </div>
      </div>

      {/* Create Request Modal */}
      {isCreatingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">
              {t.needSignal.newRequest}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {t.needSignal.subtitle}
            </p>

            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  {t.needSignal.requestTitle}
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Optimize Discord Interaction ACK Latency"
                  className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  {t.needSignal.requestDesc}
                </label>
                <textarea
                  required
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Clearly state what outcome is expected..."
                  className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    {t.common.category}
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white"
                  >
                    {community.contributionCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    {t.needSignal.priorityLevel}
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white capitalize"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  {t.needSignal.skillsRequired}
                </label>
                <input
                  type="text"
                  value={newSkills}
                  onChange={(e) => setNewSkills(e.target.value)}
                  placeholder="e.g. TypeScript, Discord API, Cryptography"
                  className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="crossCommCheck"
                  checked={newCrossCommunity}
                  onChange={(e) => setNewCrossCommunity(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="crossCommCheck" className="text-xs text-slate-300 cursor-pointer">
                  {t.needSignal.crossCommunity}
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingRequest(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  {t.common.create}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
