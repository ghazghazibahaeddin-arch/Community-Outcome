'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AuthPortal } from '@/components/AuthPortal';
import { sanitizeReturnTo } from '@/lib/services/validation';
import { Language } from '@/lib/types';

export default function SignupPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('lang');
      if (q === 'ar' || q === 'en') return q;
    }
    return 'en';
  });

  const returnTo = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const raw = new URLSearchParams(window.location.search).get('returnTo');
    return sanitizeReturnTo(raw, '');
  }, []);

  return (
    <AuthPortal
      lang={lang}
      onToggleLang={() => setLang((prev) => (prev === 'en' ? 'ar' : 'en'))}
      initialMode="signup"
      returnTo={returnTo || undefined}
      onAuthenticated={(_user, defaultWorkspace) => {
        if (returnTo) {
          router.push(returnTo);
        } else {
          router.push(`/?tab=${defaultWorkspace}${defaultWorkspace === 'owner' ? '&onboarding=owner' : ''}`);
        }
        router.refresh();
      }}
    />
  );
}
