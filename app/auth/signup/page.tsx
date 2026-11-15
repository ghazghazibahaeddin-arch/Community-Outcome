'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthPortal } from '@/components/AuthPortal';
import { Language } from '@/lib/types';

export default function SignupPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');

  return (
    <AuthPortal
      lang={lang}
      onToggleLang={() => setLang((prev) => (prev === 'en' ? 'ar' : 'en'))}
      initialMode="signup"
      onAuthenticated={(_user, defaultWorkspace) => {
        router.push(`/?tab=${defaultWorkspace}${defaultWorkspace === 'owner' ? '&onboarding=owner' : ''}`);
        router.refresh();
      }}
    />
  );
}
