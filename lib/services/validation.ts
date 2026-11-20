// Community OS — Central Input, URL, Redirect, & Domain Validation Helpers

const PRIVATE_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^\[::1\]$/,
  /\.local$/i,
  /\.internal$/i
];

/**
 * Validates that a URL is strictly http: or https:, well-formed, free of embedded credentials,
 * and not pointing to localhost, link-local, or private intranet IP ranges (SSRF/XSS guard).
 */
export function isValidHttpUrl(rawUrl: string | undefined | null, options?: { allowLocalhost?: boolean }): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 2048) return false;

  // Reject dangerous schemes immediately
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:') ||
    lower.startsWith('blob:')
  ) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    if (!parsed.hostname || parsed.username || parsed.password) {
      return false;
    }
    if (!options?.allowLocalhost) {
      const host = parsed.hostname.toLowerCase();
      if (PRIVATE_HOSTNAME_PATTERNS.some((re) => re.test(host))) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export function validateEvidenceUrl(rawUrl: string | undefined | null): { valid: boolean; normalized?: string; error?: string } {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Evidence URL is required and cannot be empty.' };
  }
  if (!isValidHttpUrl(trimmed)) {
    return {
      valid: false,
      error: 'Invalid evidence URL: must be a public http:// or https:// link (javascript:, data:, file:, and internal network hosts are blocked).'
    };
  }
  return { valid: true, normalized: trimmed };
}

export function sanitizeUrlList(urls: unknown): { valid: boolean; sanitized: string[]; error?: string } {
  if (!Array.isArray(urls)) return { valid: true, sanitized: [] };
  const sanitized: string[] = [];
  for (const item of urls) {
    const str = String(item || '').trim();
    if (!str) continue;
    if (!isValidHttpUrl(str)) {
      return {
        valid: false,
        sanitized: [],
        error: `Blocked unsafe or malformed URL: "${str.slice(0, 60)}"`
      };
    }
    sanitized.push(str);
  }
  return { valid: true, sanitized };
}

/**
 * Prevents Open Redirect vulnerabilities on returnTo / next query parameters.
 * Allows ONLY relative internal paths starting with single '/' (blocking '//', 'http:', '\r', '\n').
 */
export function sanitizeReturnTo(rawReturnTo: string | null | undefined, fallback = '/'): string {
  if (!rawReturnTo || typeof rawReturnTo !== 'string') return fallback;
  const trimmed = rawReturnTo.trim();
  if (!trimmed) return fallback;
  if (/[\r\n]/.test(trimmed)) return fallback;
  // Must start with single '/' and NOT '//' or '/\'
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return fallback;
  }
  // Verify parsed URL against a dummy base still resolves to same dummy origin
  try {
    const dummy = 'https://community-os.invalid';
    const resolved = new URL(trimmed, dummy);
    if (resolved.origin !== dummy) {
      return fallback;
    }
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}

export function sanitizeSlug(rawSlug: string): string {
  return String(rawSlug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

export function hasMinPasswordLength(password: string, min = 8): boolean {
  return typeof password === 'string' && password.length >= min;
}
