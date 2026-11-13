import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl">
        <p className="text-xs font-mono uppercase tracking-widest text-indigo-400">404 · Not Found</p>
        <h1 className="text-2xl font-bold text-white">Page Not Found</h1>
        <p className="text-sm text-slate-400">
          The requested Community OS route or resource could not be found.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Return to Community OS
          </Link>
        </div>
      </div>
    </div>
  );
}
