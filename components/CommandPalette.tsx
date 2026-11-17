'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Community,
  NeedSignalRequest,
  PlanTask,
  Language
} from '@/lib/types';
import { WorkspaceMode } from './Header';
import {
  Search,
  X,
  Building2,
  MessageSquare,
  ListChecks,
  Shield,
  UserCheck,
  Bot,
  CreditCard,
  MonitorSmartphone,
  Lock,
  ArrowRight
} from 'lucide-react';

interface CommandItem {
  id: string;
  group: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  communities: Community[];
  requests: NeedSignalRequest[];
  tasks: PlanTask[];
  isOwnerOrAdmin: boolean;
  onSelectCommunity: (id: string) => void;
  onNavigate: (mode: WorkspaceMode, options?: { tab?: string; ownerSection?: 'operations' | 'connect' | 'pricing'; memberSubTab?: string }) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  lang,
  communities,
  requests,
  tasks,
  isOwnerOrAdmin,
  onSelectCommunity,
  onNavigate
}) => {
  const isRtl = lang === 'ar';
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => {
      setQuery('');
      setSelectedIndex(0);
      inputRef.current?.focus();
    }, 10);
    return () => clearTimeout(t);
  }, [isOpen]);

  const allItems = useMemo<CommandItem[]>(() => {
    const shortcuts: CommandItem[] = [
      ...(isOwnerOrAdmin
        ? [
            {
              id: 'nav_owner_ops',
              group: isRtl ? 'تنقل سريع' : 'Quick Jump',
              title: isRtl ? 'مساحة مدير المجموعة — قائمة الأولويات' : 'Owner Workspace — Priority Queue',
              subtitle: isRtl ? 'إدارة الطلبات، المراجعات، الأعضاء والدعوات' : 'Triage offers, reviews, roles & invites',
              icon: Shield,
              onSelect: () => onNavigate('owner', { ownerSection: 'operations' })
            },
            {
              id: 'nav_owner_bots',
              group: isRtl ? 'تنقل سريع' : 'Quick Jump',
              title: isRtl ? 'ربط بوت ديسكورد وبوت تيلغرام' : 'Discord & Telegram Bot Connection Hubs',
              subtitle: isRtl ? 'فحص البوتات، مزامنة أوامر /، نشر القوائم' : 'Verify bots, sync / commands & publish menus',
              icon: Bot,
              onSelect: () => onNavigate('owner', { ownerSection: 'connect' })
            }
          ]
        : []),
      {
        id: 'nav_member',
        group: isRtl ? 'تنقل سريع' : 'Quick Jump',
        title: isRtl ? 'مساحة العضو الشخصية' : 'Member Workspace & Action Hub',
        subtitle: isRtl ? 'الإشعارات، المهام، الجواز الموثق وربط الحساب' : 'Inbox, tasks, passport & personal links',
        icon: UserCheck,
        onSelect: () => onNavigate('member', { memberSubTab: 'inbox' })
      },
      {
        id: 'nav_billing',
        group: isRtl ? 'تنقل سريع' : 'Quick Jump',
        title: isRtl ? 'الدفع والخطط وحدود الاستهلاك' : 'Plans, Payment Timing & Quota Usage',
        subtitle: isRtl ? 'الأعضاء $0 للأبد · ترقية المالك عبر Whop' : 'Members $0 forever · Owner Pro ($15/mo)',
        icon: CreditCard,
        onSelect: () => onNavigate('billing')
      },
      {
        id: 'nav_devices',
        group: isRtl ? 'تنقل سريع' : 'Quick Jump',
        title: isRtl ? 'مركز الكمبيوتر والهاتف' : 'PC & Mobile Access Hub',
        subtitle: isRtl ? 'كود ربط سريع وتبديل تخطيط الشاشة' : '1-tap /connect codes & layout preview',
        icon: MonitorSmartphone,
        onSelect: () => onNavigate('devices')
      },
      {
        id: 'nav_privacy',
        group: isRtl ? 'تنقل سريع' : 'Quick Jump',
        title: isRtl ? 'الخصوصية والسياسات وتصدير البيانات' : 'Privacy, Policies & JSON Data Export',
        subtitle: isRtl ? 'صلاحيات البوتات، الحوكمة وحماية الهوية' : 'Bot scopes, consent rules & data export',
        icon: Lock,
        onSelect: () => onNavigate('privacy')
      }
    ];

    const commItems: CommandItem[] = communities.slice(0, 6).map((c) => ({
      id: `comm_${c.id}`,
      group: isRtl ? 'المجتمعات والمجموعات' : 'Communities & Servers',
      title: c.name,
      subtitle: `${c.category || 'Community'} · ${c.discordConfig?.connected ? 'Discord' : ''}${c.discordConfig?.connected && c.telegramConfig?.connected ? ' + ' : ''}${c.telegramConfig?.connected ? 'Telegram' : (!c.discordConfig?.connected ? 'Web' : '')}`,
      icon: Building2,
      onSelect: () => onSelectCommunity(c.id)
    }));

    const reqItems: CommandItem[] = requests.slice(0, 6).map((r) => ({
      id: `req_${r.id}`,
      group: isRtl ? 'الطلبات النشطة' : 'Active NeedSignal Requests',
      title: r.title,
      subtitle: `${r.status.replace('_', ' ')} · ${r.priority}`,
      icon: MessageSquare,
      onSelect: () => onNavigate('modules', { tab: 'requests' })
    }));

    const taskItems: CommandItem[] = tasks.slice(0, 6).map((t) => ({
      id: `tsk_${t.id}`,
      group: isRtl ? 'المهام والمكافآت' : 'Tasks & Open Bounties',
      title: t.title,
      subtitle: `${t.status.replace('_', ' ')}${t.assigneeId ? '' : ' · Open Bounty'}`,
      icon: ListChecks,
      onSelect: () => onNavigate('modules', { tab: 'tasks' })
    }));

    return [...shortcuts, ...commItems, ...reqItems, ...taskItems];
  }, [communities, requests, tasks, isOwnerOrAdmin, isRtl, onNavigate, onSelectCommunity]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems.slice(0, 12);
    return allItems
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.group.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [allItems, query]);

  const safeIndex = filtered.length > 0 ? Math.min(selectedIndex, filtered.length - 1) : 0;

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0));
      } else if (e.key === 'Enter' && filtered[safeIndex]) {
        e.preventDefault();
        filtered[safeIndex].onSelect();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, filtered, safeIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 backdrop-blur-sm px-4 pt-16 sm:pt-24"
      onClick={onClose}
    >
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl border border-slate-700/80 bg-[#0d1322] shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
          <Search className="h-4 w-4 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={
              isRtl
                ? 'ابحث عن مجتمع، مهمة، طلب، أو قسم (مثال: ديسكورد، الدفع، الخصوصية)...'
                : 'Jump to community, request, task, bots, billing, or privacy...'
            }
            className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              {isRtl ? 'لا توجد نتائج مطابقة لبحثك.' : 'No matching items found.'}
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === safeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    item.onSelect();
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-start transition-colors ${
                    isSelected
                      ? 'bg-indigo-600/25 border border-indigo-500/40 text-white'
                      : 'border border-transparent text-slate-300 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-indigo-400">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{item.title}</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        <span>{item.group}</span>
                        <span className="mx-1.5">·</span>
                        <span>{item.subtitle}</span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-indigo-300' : 'text-slate-600'} ${isRtl ? 'rotate-180' : ''}`} />
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-800/80 bg-slate-950/60 px-4 py-2 text-[11px] text-slate-500">
          <span>{isRtl ? 'استخدم الأسهم و Enter للانتقال السريع' : 'Use ↑ ↓ & Enter to navigate instantly'}</span>
          <span className="font-mono">Esc</span>
        </div>
      </div>
    </div>
  );
};
