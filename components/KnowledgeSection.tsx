'use client';

import React, { useState } from 'react';
import { translations } from '@/lib/i18n';
import { KnowledgeArticle, TrustedSourceCard, Community, User, Language } from '@/lib/types';
import { BookOpen, ExternalLink, RefreshCw, Plus, CheckCircle, Shield, History } from 'lucide-react';

interface KnowledgeSectionProps {
  knowledge: KnowledgeArticle[];
  sourceCards: TrustedSourceCard[];
  community: Community;
  currentUser: User;
  lang: Language;
  onRefresh: () => void;
}

export const KnowledgeSection: React.FC<KnowledgeSectionProps> = ({
  knowledge,
  sourceCards,
  community,
  currentUser,
  lang,
  onRefresh
}) => {
  const t = translations[lang];

  const [activeSubTab, setActiveSubTab] = useState<'articles' | 'sourceCards'>('articles');
  const [isPublishing, setIsPublishing] = useState(false);
  const [supersedingArticleId, setSupersedingArticleId] = useState<string | null>(null);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Architecture');
  const [newContent, setNewContent] = useState('');
  const [newSourceTitle, setNewSourceTitle] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [supersededContent, setSupersededContent] = useState('');

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publish_knowledge',
          payload: {
            communityId: community.id,
            title: newTitle,
            content: newContent,
            category: newCategory,
            authorId: currentUser.id,
            reviewDueIntervalDays: 90,
            sources: newSourceTitle ? [{ title: newSourceTitle, url: newSourceUrl, context: 'Primary reference' }] : []
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsPublishing(false);
        setNewTitle('');
        setNewContent('');
        setNewSourceTitle('');
        setNewSourceUrl('');
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to publish knowledge:', err);
    }
  };

  const handleSupersede = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supersedingArticleId || !supersededContent.trim()) return;

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'supersede_knowledge',
          payload: {
            oldArticleId: supersedingArticleId,
            newContent: supersededContent,
            authorId: currentUser.id
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setSupersedingArticleId(null);
        setSupersededContent('');
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to supersede article:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('articles')}
            className={`pb-2 transition-colors ${
              activeSubTab === 'articles' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Knowledge Articles ({knowledge.length})
          </button>
          <button
            onClick={() => setActiveSubTab('sourceCards')}
            className={`pb-2 transition-colors ${
              activeSubTab === 'sourceCards' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Trusted Source Cards (Link-16) ({sourceCards.length})
          </button>
        </div>

        {activeSubTab === 'articles' && (
          <button
            onClick={() => setIsPublishing(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Publish Knowledge Item</span>
          </button>
        )}
      </div>

      {/* SubTab 1: Articles */}
      {activeSubTab === 'articles' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            SourceTrail connects important decisions and knowledge directly to verifiable primary documents, with scheduled review intervals (MOD-4).
          </p>

          {isPublishing && (
            <form onSubmit={handlePublish} className="rounded-xl border border-slate-700 bg-slate-800/60 p-5 space-y-4">
              <h4 className="text-xs font-bold text-white">Publish Sourced Knowledge</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Tenant Isolation & DB Consistency Standards"
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Category</label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Content / Documented Guidance</label>
                <textarea
                  required
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Provide precise, verifiable guidelines..."
                  className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Primary Source Title</label>
                  <input
                    type="text"
                    value={newSourceTitle}
                    onChange={(e) => setNewSourceTitle(e.target.value)}
                    placeholder="e.g. OWASP Tenant Isolation Guideline"
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Source URL</label>
                  <input
                    type="url"
                    value={newSourceUrl}
                    onChange={(e) => setNewSourceUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPublishing(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Publish Article
                </button>
              </div>
            </form>
          )}

          {/* Supersede Drawer */}
          {supersedingArticleId && (
            <form onSubmit={handleSupersede} className="rounded-xl border border-indigo-600/60 bg-indigo-950/20 p-5 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-indigo-400" />
                <span>Supersede Knowledge with New Version</span>
              </h4>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Updated Content / Policies</label>
                <textarea
                  required
                  rows={3}
                  value={supersededContent}
                  onChange={(e) => setSupersededContent(e.target.value)}
                  placeholder="Explain new rules, marking previous version superseded..."
                  className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSupersedingArticleId(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Publish New Version
                </button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {knowledge.map((k) => (
              <div
                key={k.id}
                className={`rounded-xl border p-5 space-y-3 ${
                  k.status === 'superseded'
                    ? 'border-slate-800/60 bg-slate-950/40 opacity-70'
                    : 'border-slate-800 bg-slate-900/40'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {lang === 'ar' && k.titleAr ? k.titleAr : k.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                      <span>{k.category}</span>
                      <span>·</span>
                      <span className="font-mono">v{k.version}</span>
                      <span>·</span>
                      <span>Last Reviewed: {new Date(k.lastReviewedDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-mono capitalize px-2 py-0.5 rounded ${
                      k.status === 'current'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {k.status}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {k.content}
                </p>

                {/* Sources list */}
                {k.sources.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2 text-xs">
                    <span className="text-slate-500 font-medium">SourceTrail:</span>
                    {k.sources.map((src, idx) => (
                      <a
                        key={idx}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>{src.title}</span>
                      </a>
                    ))}
                  </div>
                )}

                {k.status === 'current' && (
                  <div className="flex justify-end pt-2 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setSupersedingArticleId(k.id);
                        setSupersededContent(k.content);
                      }}
                      className="text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      Supersede with Revision
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SubTab 2: Trusted Source Cards (Link-16) */}
      {activeSubTab === 'sourceCards' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            A Trusted Source Card (Link-16) is independently shareable, attaching factual answers to their exact peer-reviewed primary sources and uncertainty boundaries.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sourceCards.map((card) => (
              <div key={card.id} className="rounded-xl border border-indigo-600/30 bg-slate-900/60 p-5 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-indigo-400 font-semibold">Link-16 Source Card</span>
                  <span className="text-emerald-400">Verified Citation</span>
                </div>
                <h4 className="text-sm font-bold text-white">
                  &quot;{card.factualClaim}&quot;
                </h4>
                <div className="text-xs text-slate-400 space-y-1">
                  <div>
                    <span className="text-slate-500">Source:</span>{' '}
                    <a href={card.primarySource} target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline underline-offset-2">
                      {card.primarySource}
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-500">Context:</span> {card.sourceContext}
                  </div>
                  {card.uncertaintyNotes && (
                    <div>
                      <span className="text-slate-500">Known Bounds:</span> {card.uncertaintyNotes}
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Auditor: {card.reviewerId}</span>
                  <span>Reviewed: {card.reviewedDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
