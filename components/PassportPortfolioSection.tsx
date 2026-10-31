'use client';

import React, { useState } from 'react';
import { translations } from '@/lib/i18n';
import { User, OutcomePortfolioItem, Contribution, OutcomeRecord, Language } from '@/lib/types';
import Image from 'next/image';
import { Shield, CheckCircle, ExternalLink, Lock, Eye, EyeOff, Globe, Share2, Award, QrCode } from 'lucide-react';

interface PassportPortfolioSectionProps {
  currentUser: User;
  portfolioItems: OutcomePortfolioItem[];
  contributions: Contribution[];
  outcomes: OutcomeRecord[];
  lang: Language;
  onRefresh: () => void;
}

export const PassportPortfolioSection: React.FC<PassportPortfolioSectionProps> = ({
  currentUser,
  portfolioItems,
  contributions,
  outcomes,
  lang,
  onRefresh
}) => {
  const t = translations[lang];

  const [activeSubTab, setActiveSubTab] = useState<'passport' | 'portfolio' | 'cards' | 'privacy'>('passport');
  const [selectedContributionId, setSelectedContributionId] = useState<string>(contributions[0]?.id || '');
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Platform Linking State
  const [discordUsername, setDiscordUsername] = useState(currentUser.identities.discordUsername || '');
  const [telegramUsername, setTelegramUsername] = useState(currentUser.identities.telegramUsername || '');

  const userPortfolio = portfolioItems.filter((p) => p.userId === currentUser.id);
  const selectedContribution = contributions.find((c) => c.id === selectedContributionId);

  const handleUpdatePrivacy = async (field: keyof User['privacy'], val: boolean) => {
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_privacy',
          payload: {
            userId: currentUser.id,
            privacy: { [field]: val }
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to update privacy:', err);
    }
  };

  const handleLinkPlatform = async (platform: 'discord' | 'telegram') => {
    const username = platform === 'discord' ? discordUsername : telegramUsername;
    if (!username.trim()) return;

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'link_platform',
          payload: {
            userId: currentUser.id,
            platform,
            id: `${platform}_${Date.now()}`,
            username
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setCopiedNotification(`Linked ${platform} account!`);
        setTimeout(() => setCopiedNotification(null), 3000);
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to link platform:', err);
    }
  };

  const handleCopyCardUrl = () => {
    navigator.clipboard.writeText(`https://community-os.org/c/${selectedContributionId}`);
    setCopiedNotification('Portable card URL copied to clipboard!');
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Subnav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('passport')}
            className={`pb-2 transition-colors ${
              activeSubTab === 'passport' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Member Passport
          </button>
          <button
            onClick={() => setActiveSubTab('portfolio')}
            className={`pb-2 transition-colors ${
              activeSubTab === 'portfolio' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Outcome Portfolio ({userPortfolio.length})
          </button>
          <button
            onClick={() => setActiveSubTab('cards')}
            className={`pb-2 transition-colors ${
              activeSubTab === 'cards' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Portable Contribution Card (ALT-5)
          </button>
          <button
            onClick={() => setActiveSubTab('privacy')}
            className={`pb-2 transition-colors ${
              activeSubTab === 'privacy' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Privacy & Identity Linking
          </button>
        </div>

        {copiedNotification && (
          <span className="text-xs text-emerald-400 font-mono animate-fade-in">
            {copiedNotification}
          </span>
        )}
      </div>

      {/* SubTab 1: Member Passport */}
      {activeSubTab === 'passport' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 text-center">
            <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-full border-2 border-indigo-500/50 bg-slate-800">
              <Image
                src={currentUser.avatar}
                alt={currentUser.name}
                fill
                sizes="80px"
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {currentUser.passport.displayName}
              </h3>
              <p className="text-xs text-indigo-400 font-mono mt-0.5">
                {currentUser.email}
              </p>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {currentUser.passport.biography}
            </p>

            {/* Linked Identifiers */}
            <div className="text-left pt-3 border-t border-slate-800 space-y-2 text-xs">
              <span className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider block">
                Verified Platform Identifiers
              </span>
              <div className="flex items-center justify-between text-slate-300">
                <span>Discord:</span>
                <span className="font-mono text-indigo-400">
                  {currentUser.identities.discordUsername || 'Not connected'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Telegram:</span>
                <span className="font-mono text-sky-400">
                  {currentUser.identities.telegramUsername || 'Not connected'}
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            {/* Skills: Self-Declared vs Independently Verified */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Skills Taxonomy (Verified vs Self-Declared)
              </h4>
              <p className="text-xs text-slate-400">
                Community OS explicitly isolates self-declared abilities from independently verified outcome evidence.
              </p>
              <div className="flex flex-wrap gap-2">
                {currentUser.passport.skills.map((skill, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                      skill.verified
                        ? 'border-emerald-600/40 bg-emerald-950/20 text-emerald-300'
                        : 'border-slate-700 bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    {skill.verified ? (
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                    )}
                    <span>{skill.name}</span>
                    {skill.verified && (
                      <span className="text-[10px] font-mono text-emerald-400">
                        ({skill.verifiedByCommunityId || 'Verified'})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* External Portfolios & Collaboration Preferences */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Collaboration Preferences
                </span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {currentUser.passport.collaborationPreferences}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Portfolio References
                </span>
                <div className="space-y-1.5">
                  {currentUser.passport.portfolioLinks.map((link, idx) => (
                    <a
                      key={idx}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>{link}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SubTab 2: Outcome Portfolio (User-5) */}
      {activeSubTab === 'portfolio' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Outcome Portfolio displays cross-community verified deliverables and projects that the member has selected to showcase.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {userPortfolio.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-indigo-400">{item.communityName}</span>
                  <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    <span>Verified</span>
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-300">
                  {item.roleDescription}
                </p>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Record: {item.outcomeRecordId}</span>
                  <span className="text-indigo-400">Publicly Shareable</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SubTab 3: Portable Contribution Card (ALT-5 / Link-5) */}
      {activeSubTab === 'cards' && (
        <div className="space-y-6">
          <p className="text-xs text-slate-400">
            A Portable Contribution Card enables sharing a single specific verified achievement with other communities without leaking private server discussions.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <select
              value={selectedContributionId}
              onChange={(e) => setSelectedContributionId(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
            >
              {contributions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.id})
                </option>
              ))}
            </select>

            <button
              onClick={handleCopyCardUrl}
              className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Share Portable Card URL</span>
            </button>
          </div>

          {selectedContribution ? (
            <div className="max-w-xl mx-auto rounded-xl border border-indigo-500/40 bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-800/40 pb-3">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    Verified Contribution Card
                  </span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded">
                  {selectedContribution.reviewStatus}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">
                  {selectedContribution.title}
                </h3>
                <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                  {selectedContribution.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <div>
                  <span className="text-[11px] text-slate-400 block">Community:</span>
                  <span className="font-semibold text-white">{selectedContribution.communityId}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Verified By Reviewer:</span>
                  <span className="font-semibold text-indigo-300">{selectedContribution.reviewerId || 'Pending'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                <span>Record ID: {selectedContribution.id}</span>
                <span>Date: {new Date(selectedContribution.submissionDate).toLocaleDateString()}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 text-center py-8">
              No contribution selected.
            </div>
          )}
        </div>
      )}

      {/* SubTab 4: Privacy & Platform Identity Linking */}
      {activeSubTab === 'privacy' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Privacy and Consent Controls (User-4)
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900/60">
                <div>
                  <span className="text-xs font-semibold text-white block">Display Public Bio</span>
                  <span className="text-[11px] text-slate-400">Show biography on public member passport</span>
                </div>
                <button
                  onClick={() => handleUpdatePrivacy('showBio', !currentUser.privacy.showBio)}
                  className={`px-3 py-1 text-xs rounded-md font-mono ${
                    currentUser.privacy.showBio ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {currentUser.privacy.showBio ? 'Visible' : 'Hidden'}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900/60">
                <div>
                  <span className="text-xs font-semibold text-white block">Verified Only Mode</span>
                  <span className="text-[11px] text-slate-400">Hide unverified self-declared skills from passport</span>
                </div>
                <button
                  onClick={() => handleUpdatePrivacy('showVerifiedOnly', !currentUser.privacy.showVerifiedOnly)}
                  className={`px-3 py-1 text-xs rounded-md font-mono ${
                    currentUser.privacy.showVerifiedOnly ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {currentUser.privacy.showVerifiedOnly ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900/60">
                <div>
                  <span className="text-xs font-semibold text-white block">Cross-Community Discovery</span>
                  <span className="text-[11px] text-slate-400">Allow partner communities to discover your expert profile</span>
                </div>
                <button
                  onClick={() => handleUpdatePrivacy('allowDiscovery', !currentUser.privacy.allowDiscovery)}
                  className={`px-3 py-1 text-xs rounded-md font-mono ${
                    currentUser.privacy.allowDiscovery ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {currentUser.privacy.allowDiscovery ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          </div>

          {/* Platform Identity Connections */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Platform Identity Connections
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Discord */}
              <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/60 space-y-3">
                <span className="text-xs font-bold text-white block">Connect Discord Identity</span>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Discord Tag / Username</label>
                  <input
                    type="text"
                    value={discordUsername}
                    onChange={(e) => setDiscordUsername(e.target.value)}
                    placeholder="user#0000 or username"
                    className="w-full rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <button
                  onClick={() => handleLinkPlatform('discord')}
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Verify & Link Discord
                </button>
              </div>

              {/* Telegram */}
              <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/60 space-y-3">
                <span className="text-xs font-bold text-white block">Connect Telegram Identity</span>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Telegram @Username</label>
                  <input
                    type="text"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                    placeholder="@telegram_handle"
                    className="w-full rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <button
                  onClick={() => handleLinkPlatform('telegram')}
                  className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
                >
                  Verify & Link Telegram
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
