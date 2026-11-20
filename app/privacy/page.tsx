'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Globe } from 'lucide-react';
import { PrivacyPoliciesSection } from '@/components/PrivacyPoliciesSection';
import { Language, User } from '@/lib/types';

export default function PrivacyPage() {
  const [lang, setLang] = useState<Language>('en');
  const [authUser, setAuthUser] = useState<User | null>(null);

  const loadUser = React.useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await res.json();
      if (data.authenticated && data.user) {
        setAuthUser(data.user);
      } else {
        setAuthUser(null);
      }
    } catch (err) {
      console.warn('[PrivacyPage] Failed to load session user:', err);
      setAuthUser(null);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      loadUser();
    }, 0);
    return () => clearTimeout(t);
  }, [loadUser]);

  const isRtl = lang === 'ar';

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-[#090d16]/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-white whitespace-nowrap shrink-0">
            <ShieldCheck className="h-5 w-5 text-indigo-400" />
            <span>Community OS</span>
          </Link>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setLang((p) => (p === 'en' ? 'ar' : 'en'))}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white whitespace-nowrap"
            >
              <Globe className="h-3.5 w-3.5 text-indigo-400" />
              <span>{lang === 'en' ? 'العربية' : 'English'}</span>
            </button>
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 whitespace-nowrap"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{isRtl ? 'العودة للمنصة' : 'Back to Platform'}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <PrivacyPoliciesSection currentUser={authUser} lang={lang} onRefresh={loadUser} />
      </main>
    </div>
  );
}
