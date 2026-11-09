// Global environment shims for Cloudflare Workers (workerd)
const g = typeof globalThis !== 'undefined'
  ? globalThis
  : typeof window !== 'undefined'
    ? window
    : typeof self !== 'undefined'
      ? self
      : (global as any);

if (typeof (g as any).__dirname === 'undefined') {
  (g as any).__dirname = '';
}
if (typeof (g as any).__filename === 'undefined') {
  (g as any).__filename = '';
}

export {};
