import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    name: 'Community OS — Outcome-Based Community Coordination',
    short_name: 'Community OS',
    description:
      'Multi-community operating system turning conversations into structured needs, verified work, mutual trust, and portable outcomes across Discord, Telegram, and Web.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#09090b',
    theme_color: '#4f46e5',
    categories: ['productivity', 'social', 'business'],
    lang: 'en',
    dir: 'ltr',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable'
      }
    ]
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
