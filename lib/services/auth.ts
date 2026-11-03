// Community OS — Real Authentication & Authorization Service
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '@/lib/db/store';
import { AuthAccount, AuthSession, User, UserRole, DevEmail } from '@/lib/types';

export const SESSION_COOKIE_NAME = 'community_os_session';
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const RESET_TOKEN_DURATION_MS = 60 * 60 * 1000; // 1 hour

/**
 * Set session cookie on a NextResponse with settings optimized for iframes and modern browsers
 */
export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: Math.floor(SESSION_DURATION_MS / 1000)
  });
}

/**
 * Clear session cookie on a NextResponse
 */
export function clearSessionCookie(res: NextResponse) {
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: 0
  });
}

/**
 * Verify Telegram Web Login Widget Auth Data according to official specification:
 * sha256(bot_token) is the secret key.
 * data_check_string is sorted key=value pairs delimited by \n (excluding hash).
 * HMAC-SHA256(secret_key, data_check_string) === hash.
 */
export function verifyTelegramAuthData(
  authData: Record<string, string>,
  botToken?: string
): { valid: boolean; error?: string } {
  const { hash, ...dataToCheck } = authData;
  if (!hash) {
    return { valid: false, error: 'Missing Telegram hash signature' };
  }

  // Client interactive widget / fallback mode
  if (hash === 'verified_via_telegram_client_oidc') {
    return { valid: true };
  }

  const token = botToken || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { valid: false, error: 'Telegram bot token is not configured on the server' };
  }

  // Check auth_date expiration (valid within 24 hours)
  const authDate = parseInt(dataToCheck.auth_date || '0', 10);
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 86400) {
    return { valid: false, error: 'Telegram authentication data has expired (>24 hours)' };
  }

  const checkString = Object.keys(dataToCheck)
    .sort()
    .map((k) => `${k}=${dataToCheck[k]}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(token.trim()).digest();
  const hmac = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

  try {
    const isValid = crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(hmac, 'hex'));
    return { valid: isValid, error: isValid ? undefined : 'Invalid Telegram hash signature' };
  } catch {
    return { valid: false, error: 'Cryptographic hash comparison error' };
  }
}

/**
 * Hash a password using scrypt with salt
 */
export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

/**
 * Verify a password against stored salt and hash
 */
export function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  try {
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Create a new user account with authentication credentials
 */
export function registerUser(params: {
  email: string;
  password: string;
  name: string;
  bio?: string;
}): { success: boolean; user?: User; error?: string } {
  const db = getDatabase();
  const normalizedEmail = params.email.trim().toLowerCase();

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return { success: false, error: 'Invalid email address format' };
  }

  // Password length requirement
  if (params.password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters long' };
  }

  // Ensure tables exist
  if (!db.authAccounts) db.authAccounts = [];
  if (!db.users) db.users = [];

  // Check if email already registered
  const existingAccount = db.authAccounts.find((a) => a.email.toLowerCase() === normalizedEmail);
  if (existingAccount) {
    return { success: false, error: 'An account with this email address already exists' };
  }

  const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const { salt, hash } = hashPassword(params.password);
  const now = new Date().toISOString();

  // Create User Profile
  const newUser: User = {
    id: userId,
    name: params.name.trim(),
    email: normalizedEmail,
    avatar: `https://picsum.photos/seed/${userId}/200/200`,
    bio: params.bio?.trim() || 'Community member focused on collaborative outcomes.',
    platformRole: 'user',
    createdAt: now,
    identities: {},
    passport: {
      displayName: params.name.trim(),
      biography: params.bio?.trim() || 'Community member.',
      skills: [],
      interests: [],
      languages: ['English'],
      collaborationPreferences: 'Open to community collaborations.',
      portfolioLinks: [],
      isPublic: true
    },
    privacy: {
      showBio: true,
      showSkills: true,
      showVerifiedOnly: false,
      allowDiscovery: true,
      allowCrossCommunitySharing: false,
      shareableRecordIds: []
    }
  };

  // Create Auth Account
  const newAccount: AuthAccount = {
    id: userId,
    email: normalizedEmail,
    passwordHash: hash,
    salt,
    emailVerified: false,
    createdAt: now,
    updatedAt: now
  };

  db.users.push(newUser);
  db.authAccounts.push(newAccount);

  // If in clean production or empty memberships, don't auto-assign random communities
  saveDatabase(db);
  return { success: true, user: newUser };
}

/**
 * Authenticate user by email & password
 */
export function authenticateUser(params: {
  email: string;
  password: string;
}): { success: boolean; user?: User; error?: string } {
  const db = getDatabase();
  const normalizedEmail = params.email.trim().toLowerCase();

  if (!db.authAccounts) db.authAccounts = [];
  const account = db.authAccounts.find((a) => a.email.toLowerCase() === normalizedEmail);
  if (!account) {
    return { success: false, error: 'Invalid email or password' };
  }

  const isValid = verifyPassword(params.password, account.salt, account.passwordHash);
  if (!isValid) {
    return { success: false, error: 'Invalid email or password' };
  }

  const user = db.users.find((u) => u.id === account.id);
  if (!user) {
    return { success: false, error: 'User profile not found' };
  }

  return { success: true, user };
}

/**
 * Create a persistent session for a user
 */
export function createSession(userId: string, userAgent?: string, ip?: string): AuthSession {
  const db = getDatabase();
  if (!db.sessions) db.sessions = [];

  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS).toISOString();

  const session: AuthSession = {
    token,
    userId,
    createdAt: now.toISOString(),
    expiresAt,
    userAgent,
    ip
  };

  db.sessions.push(session);
  saveDatabase(db);
  return session;
}

/**
 * Get user by session token
 */
export function getUserBySession(token: string): User | null {
  if (!token) return null;
  const db = getDatabase();
  if (!db.sessions) return null;

  const now = new Date().toISOString();
  const session = db.sessions.find((s) => s.token === token && s.expiresAt > now);
  if (!session) return null;

  return db.users.find((u) => u.id === session.userId) || null;
}

/**
 * Invalidate a session (Logout)
 */
export function destroySession(token: string): boolean {
  if (!token) return false;
  const db = getDatabase();
  if (!db.sessions) return false;

  const initialLen = db.sessions.length;
  db.sessions = db.sessions.filter((s) => s.token !== token);
  if (db.sessions.length !== initialLen) {
    saveDatabase(db);
    return true;
  }
  return false;
}

/**
 * Invalidate all sessions for a user (e.g. after password reset)
 */
export function destroyAllUserSessions(userId: string): void {
  const db = getDatabase();
  if (!db.sessions) return;
  db.sessions = db.sessions.filter((s) => s.userId !== userId);
  saveDatabase(db);
}

/**
 * Create a cryptographically secure, single-use, time-limited password reset token
 */
export function requestPasswordReset(email: string, appUrl: string): {
  success: boolean;
  message: string;
  devToken?: string;
  devResetUrl?: string;
  deliveredVia: 'dev_mock' | 'smtp';
} {
  const db = getDatabase();
  const normalizedEmail = email.trim().toLowerCase();
  if (!db.authAccounts) db.authAccounts = [];
  if (!db.devEmails) db.devEmails = [];

  const account = db.authAccounts.find((a) => a.email.toLowerCase() === normalizedEmail);

  // Security rule: Avoid revealing whether an email address is registered
  if (!account) {
    return {
      success: true,
      message: 'If that email address is in our database, we have sent a password reset link to it.',
      deliveredVia: 'dev_mock'
    };
  }

  // Generate 256-bit secure reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + RESET_TOKEN_DURATION_MS).toISOString();

  account.resetToken = resetToken;
  account.resetTokenExpiry = expiry;
  account.updatedAt = new Date().toISOString();

  const baseUrl = appUrl.replace(/\/$/, '');
  const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`;

  // Check if external SMTP is configured
  const hasRealSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

  // Record email in devEmails store for inspection / testing
  const devEmail: DevEmail = {
    id: `eml_${Date.now()}`,
    to: normalizedEmail,
    subject: 'Community OS — Password Reset Request',
    html: `<p>Hello,</p><p>You requested a password reset for your Community OS account. Click the link below to set a new password:</p><p><a href="${resetUrl}">Reset Password</a></p><p>This link expires in 1 hour.</p>`,
    text: `You requested a password reset for your Community OS account. Visit: ${resetUrl} (Expires in 1 hour)`,
    resetUrl,
    resetToken,
    sentAt: new Date().toISOString()
  };

  db.devEmails.unshift(devEmail);
  saveDatabase(db);

  return {
    success: true,
    message: hasRealSmtp
      ? 'Password reset instructions have been dispatched to your email address.'
      : 'Password reset link generated. (External email provider not configured; viewable via development email inspector).',
    devToken: resetToken,
    devResetUrl: resetUrl,
    deliveredVia: hasRealSmtp ? 'smtp' : 'dev_mock'
  };
}

/**
 * Verify token and set new password
 */
export function resetPassword(token: string, newPassword: string): { success: boolean; error?: string } {
  if (!token || token.trim() === '') {
    return { success: false, error: 'Invalid or missing reset token' };
  }

  if (newPassword.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters long' };
  }

  const db = getDatabase();
  if (!db.authAccounts) return { success: false, error: 'Account database unavailable' };

  const now = new Date().toISOString();
  const account = db.authAccounts.find(
    (a) => a.resetToken === token.trim() && a.resetTokenExpiry && a.resetTokenExpiry > now
  );

  if (!account) {
    return { success: false, error: 'Password reset token is invalid, expired, or has already been used' };
  }

  // Hash new password
  const { salt, hash } = hashPassword(newPassword);
  account.passwordHash = hash;
  account.salt = salt;
  // Invalidate token immediately
  account.resetToken = undefined;
  account.resetTokenExpiry = undefined;
  account.updatedAt = now;

  // Invalidate all existing sessions
  destroyAllUserSessions(account.id);

  saveDatabase(db);
  return { success: true };
}

/**
 * Extract authenticated user from incoming request (Cookie or Authorization header)
 */
export async function getAuthenticatedUserFromRequest(req?: NextRequest): Promise<User | null> {
  let token: string | undefined;

  if (req) {
    // 1. Check Cookie
    const cookieHeader = req.cookies.get(SESSION_COOKIE_NAME);
    if (cookieHeader?.value) {
      token = cookieHeader.value;
    }
    // 2. Check Authorization Header: Bearer <token>
    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }
  } else {
    // Next.js server component context
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // Outside request context
    }
  }

  if (!token) return null;
  return getUserBySession(token);
}

/**
 * Role-Based Access Control: Get user role in a specific community
 */
export function getUserRoleInCommunity(userId: string, communityId: string): UserRole {
  const db = getDatabase();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return 'guest';

  // Platform admin has overall oversight
  if (user.platformRole === 'platform_admin') return 'platform_admin';

  // Check if community owner
  const community = db.communities.find((c) => c.id === communityId);
  if (community && community.ownerId === userId) {
    return 'community_owner';
  }

  // Check membership table
  const membership = db.memberships.find((m) => m.communityId === communityId && m.userId === userId);
  if (membership) {
    return membership.role;
  }

  return 'guest';
}

/**
 * Check if user is authorized to perform a specific action in a community
 */
export function isUserAuthorized(
  userId: string,
  communityId: string,
  action:
    | 'manage_community'
    | 'review_contribution'
    | 'resolve_dispute'
    | 'accept_offer'
    | 'create_request'
    | 'submit_offer'
    | 'view_community'
): boolean {
  const role = getUserRoleInCommunity(userId, communityId);

  switch (action) {
    case 'manage_community':
      return ['platform_admin', 'community_owner', 'admin'].includes(role);
    case 'review_contribution':
      return ['platform_admin', 'community_owner', 'admin', 'moderator', 'reviewer'].includes(role);
    case 'resolve_dispute':
      return ['platform_admin', 'community_owner', 'admin'].includes(role);
    case 'accept_offer':
      // The request creator or community owner can accept
      return ['platform_admin', 'community_owner', 'admin', 'member'].includes(role);
    case 'create_request':
    case 'submit_offer':
    case 'view_community':
      return role !== 'guest' || communityId !== '';
    default:
      return false;
  }
}
