import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Community OS — Multi-Community Operating System',
  description: 'Multi-community operating system turning conversations into structured needs, verified work, mutual trust, and portable outcomes across Discord, Telegram, and Web.',
  openGraph: {
    title: 'Community OS — Multi-Community Operating System',
    description: 'Multi-community operating system turning conversations into structured needs, verified work, mutual trust, and portable outcomes across Discord, Telegram, and Web.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Community OS — Multi-Community Operating System',
    description: 'Multi-community operating system turning conversations into structured needs, verified work, mutual trust, and portable outcomes across Discord, Telegram, and Web.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
