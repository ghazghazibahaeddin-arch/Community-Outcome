import './shims';
// Community OS — Cloudflare Workers Free Production Entrypoint
// Provides edge request handling, Next.js routing, in-process API execution, and asset delivery

import { NextRequest } from 'next/server';
import templateData from './html_template.json';
import { setRuntimeEnv } from '../lib/env';

// In-process Route Handlers for full Edge Execution
import * as authMe from '../app/api/auth/me/route';
import * as authLogin from '../app/api/auth/login/route';
import * as authSignup from '../app/api/auth/signup/route';
import * as authLogout from '../app/api/auth/logout/route';
import * as authForgotPw from '../app/api/auth/forgot-password/route';
import * as authResetPw from '../app/api/auth/reset-password/route';
import * as authDevEmails from '../app/api/auth/dev-emails/route';
import * as tgAuth from '../app/api/auth/telegram/authorize/route';
import * as tgCallback from '../app/api/auth/telegram/callback/route';
import * as tgConfig from '../app/api/auth/telegram/config/route';
import * as tgLogin from '../app/api/auth/telegram/login/route';
import * as dataRoute from '../app/api/data/route';
import * as discordConnect from '../app/api/discord/connect/route';
import * as discordCallback from '../app/api/discord/callback/route';
import * as discordInteractions from '../app/api/discord/interactions/route';
import * as discordRegCommands from '../app/api/discord/register-commands/route';
import * as discordPubMenu from '../app/api/discord/publish-menu/route';
import * as tgWebhook from '../app/api/telegram/webhook/route';
import * as tgRegWebhook from '../app/api/telegram/register-webhook/route';
import * as tgChallenge from '../app/api/telegram/challenge/route';
import * as tgPubMenu from '../app/api/telegram/publish-menu/route';
import * as billingSub from '../app/api/billing/subscription/route';
import * as whopWebhook from '../app/api/webhooks/whop/route';
import * as gumroadWebhook from '../app/api/webhooks/gumroad/route';
import * as intVerify from '../app/api/integrations/verify/route';
import * as referrals from '../app/api/referrals/route';

export interface Env {
  ASSETS?: Fetcher;
  NODE_ENV?: string;
  APP_URL?: string;
  APP_INTERNAL_URL?: string;
  ORIGIN_URL?: string;

  // Discord
  DISCORD_APPLICATION_ID?: string;
  DISCORD_BOT_TOKEN?: string;
  DISCORD_CLIENT_SECRET?: string;
  DISCORD_PUBLIC_KEY?: string;
  DISCORD_REDIRECT_URI?: string;

  // Telegram
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_BOT_USERNAME?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  TELEGRAM_OIDC_CLIENT_ID?: string;
  TELEGRAM_OIDC_CLIENT_SECRET?: string;
  TELEGRAM_REDIRECT_URI?: string;

  // Supabase
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;

  // Whop
  WHOP_COMPANY_API_KEY?: string;
  WHOP_API_KEY?: string;
  WHOP_WEBHOOK_SECRET?: string;
  WHOP_PRO_PLAN_ID?: string;
  WHOP_PURCHASE_URL?: string;
  WHOP_PRODUCT_URL?: string;
}

function syncEnvironment(env: Env): void {
  if (typeof process === 'undefined' || !process.env) return;
  const procEnv = process.env as Record<string, string | undefined>;

  // App
  if (env.APP_URL) procEnv.APP_URL = env.APP_URL;
  if (env.NODE_ENV) procEnv.NODE_ENV = env.NODE_ENV;

  // Discord
  if (env.DISCORD_APPLICATION_ID) procEnv.DISCORD_APPLICATION_ID = env.DISCORD_APPLICATION_ID;
  if (env.DISCORD_BOT_TOKEN) procEnv.DISCORD_BOT_TOKEN = env.DISCORD_BOT_TOKEN;
  if (env.DISCORD_CLIENT_SECRET) procEnv.DISCORD_CLIENT_SECRET = env.DISCORD_CLIENT_SECRET;
  if (env.DISCORD_PUBLIC_KEY) procEnv.DISCORD_PUBLIC_KEY = env.DISCORD_PUBLIC_KEY;
  if (env.DISCORD_REDIRECT_URI) procEnv.DISCORD_REDIRECT_URI = env.DISCORD_REDIRECT_URI;

  // Telegram
  if (env.TELEGRAM_BOT_TOKEN) procEnv.TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;
  if (env.TELEGRAM_BOT_USERNAME) {
    procEnv.TELEGRAM_BOT_USERNAME = env.TELEGRAM_BOT_USERNAME;
    procEnv.TELEGRAM_BOT_NAME = env.TELEGRAM_BOT_USERNAME;
  }
  if (env.TELEGRAM_WEBHOOK_SECRET) procEnv.TELEGRAM_WEBHOOK_SECRET = env.TELEGRAM_WEBHOOK_SECRET;
  if (env.TELEGRAM_OIDC_CLIENT_ID) procEnv.TELEGRAM_OIDC_CLIENT_ID = env.TELEGRAM_OIDC_CLIENT_ID;
  if (env.TELEGRAM_OIDC_CLIENT_SECRET) procEnv.TELEGRAM_OIDC_CLIENT_SECRET = env.TELEGRAM_OIDC_CLIENT_SECRET;
  if (env.TELEGRAM_REDIRECT_URI) procEnv.TELEGRAM_REDIRECT_URI = env.TELEGRAM_REDIRECT_URI;

  // Supabase (Canonical + backwards-compatible aliases)
  if (env.SUPABASE_URL && !procEnv.SUPABASE_URL) procEnv.SUPABASE_URL = env.SUPABASE_URL;
  const secretKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (secretKey) {
    if (!procEnv.SUPABASE_SECRET_KEY) procEnv.SUPABASE_SECRET_KEY = secretKey;
    if (!procEnv.SUPABASE_SERVICE_ROLE_KEY) procEnv.SUPABASE_SERVICE_ROLE_KEY = secretKey;
  }
  const pubKey = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
  if (pubKey) {
    if (!procEnv.SUPABASE_PUBLISHABLE_KEY) procEnv.SUPABASE_PUBLISHABLE_KEY = pubKey;
    if (!procEnv.SUPABASE_ANON_KEY) procEnv.SUPABASE_ANON_KEY = pubKey;
  }

  // Whop
  const whopApiKey = env.WHOP_COMPANY_API_KEY || env.WHOP_API_KEY;
  if (whopApiKey) {
    if (!procEnv.WHOP_COMPANY_API_KEY) procEnv.WHOP_COMPANY_API_KEY = whopApiKey;
    if (!procEnv.WHOP_API_KEY) procEnv.WHOP_API_KEY = whopApiKey;
  }
  if (env.WHOP_WEBHOOK_SECRET && !procEnv.WHOP_WEBHOOK_SECRET) procEnv.WHOP_WEBHOOK_SECRET = env.WHOP_WEBHOOK_SECRET;
  if (env.WHOP_PRO_PLAN_ID && !procEnv.WHOP_PRO_PLAN_ID) procEnv.WHOP_PRO_PLAN_ID = env.WHOP_PRO_PLAN_ID;
  if (env.WHOP_PURCHASE_URL && !procEnv.WHOP_PURCHASE_URL) procEnv.WHOP_PURCHASE_URL = env.WHOP_PURCHASE_URL;
  if (env.WHOP_PRODUCT_URL && !procEnv.WHOP_PRODUCT_URL) procEnv.WHOP_PRODUCT_URL = env.WHOP_PRODUCT_URL;
}

async function dispatchApiRoute(request: Request, pathname: string, env: Env): Promise<Response | null> {
  const method = request.method.toUpperCase();
  const nextReq = new NextRequest(request);

  switch (pathname) {
    case '/api/auth/me':
      if (method === 'GET') return await authMe.GET(nextReq);
      break;
    case '/api/auth/login':
      if (method === 'POST') return await authLogin.POST(nextReq);
      break;
    case '/api/auth/signup':
      if (method === 'POST') return await authSignup.POST(nextReq);
      break;
    case '/api/auth/logout':
      if (method === 'POST') return await authLogout.POST(nextReq);
      break;
    case '/api/auth/forgot-password':
      if (method === 'POST') return await authForgotPw.POST(nextReq, env);
      break;
    case '/api/auth/reset-password':
      if (method === 'POST') return await authResetPw.POST(nextReq);
      break;
    case '/api/auth/dev-emails':
      if (method === 'GET') return await authDevEmails.GET(nextReq, env);
      break;
    case '/api/auth/telegram/authorize':
      if (method === 'GET') return await tgAuth.GET(nextReq, env);
      break;
    case '/api/auth/telegram/callback':
      if (method === 'GET') return await tgCallback.GET(nextReq, env);
      break;
    case '/api/auth/telegram/config':
      if (method === 'GET') return await tgConfig.GET(nextReq, env);
      break;
    case '/api/auth/telegram/login':
      if (method === 'POST') return await tgLogin.POST(nextReq, env);
      if (method === 'GET') return await tgLogin.GET(nextReq, env);
      break;
    case '/api/data':
      if (method === 'POST') return await dataRoute.POST(nextReq);
      if (method === 'GET') return await dataRoute.GET(nextReq);
      break;
    case '/api/discord/connect':
      if (method === 'GET') return await discordConnect.GET(nextReq, env);
      if (method === 'POST') return await discordConnect.POST(nextReq, env);
      break;
    case '/api/discord/callback':
      if (method === 'GET') return await discordCallback.GET(nextReq, env);
      break;
    case '/api/discord/interactions':
      if (method === 'POST') return await discordInteractions.POST(nextReq, env);
      break;
    case '/api/discord/register-commands':
      if (method === 'POST') return await discordRegCommands.POST(nextReq, env);
      break;
    case '/api/discord/publish-menu':
      if (method === 'POST') return await discordPubMenu.POST(nextReq, env);
      break;
    case '/api/telegram/webhook':
      if (method === 'POST') return await tgWebhook.POST(nextReq, env);
      break;
    case '/api/telegram/register-webhook':
      if (method === 'POST') return await tgRegWebhook.POST(nextReq, env);
      if (method === 'GET') return await (tgRegWebhook as any).GET?.(nextReq, env);
      break;
    case '/api/telegram/challenge':
      if (method === 'POST') return await tgChallenge.POST(nextReq, env);
      break;
    case '/api/telegram/publish-menu':
      if (method === 'POST') return await tgPubMenu.POST(nextReq, env);
      break;
    case '/api/billing/subscription':
      if (method === 'GET') return await billingSub.GET(nextReq, env);
      break;
    case '/api/webhooks/whop':
      if (method === 'POST') return await whopWebhook.POST(nextReq, env);
      break;
    case '/api/webhooks/gumroad':
      if (method === 'POST') return await gumroadWebhook.POST(nextReq, env);
      break;
    case '/api/integrations/verify':
      if (method === 'POST') return await intVerify.POST(nextReq, env);
      break;
    case '/api/referrals':
      if (method === 'GET') return await referrals.GET(nextReq, env);
      if (method === 'POST') return await referrals.POST(nextReq, env);
      break;
  }
  return null;
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 1. Forward runtime environment variables and secrets
    setRuntimeEnv(env);
    syncEnvironment(env);

    // 2. Health & Status check endpoint (reads directly from env.*)
    if (url.pathname === '/api/cf-health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        platform: 'Cloudflare Workers Free',
        workerRuntime: 'workerd',
        timestamp: new Date().toISOString(),
        supabaseConfigured: Boolean(env.SUPABASE_URL && (env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY)),
        telegramConfigured: Boolean(env.TELEGRAM_BOT_TOKEN),
        discordConfigured: Boolean(env.DISCORD_BOT_TOKEN),
        whopConfigured: Boolean(env.WHOP_WEBHOOK_SECRET || env.WHOP_COMPANY_API_KEY || env.WHOP_API_KEY),
        appUrl: env.APP_URL || url.origin
      }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }

    // 3. In-process API Route Dispatching
    if (url.pathname.startsWith('/api/')) {
      try {
        const apiResponse = await dispatchApiRoute(request, url.pathname, env);
        if (apiResponse) {
          return apiResponse;
        }
      } catch (err: any) {
        console.error(`[API Error] ${url.pathname}:`, err);
        return new Response(JSON.stringify({ error: err?.message || 'Internal Server Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 4. Static Assets serving via Cloudflare Worker Assets binding
    if (env.ASSETS) {
      try {
        // Direct path match
        const assetResponse = await env.ASSETS.fetch(request);
        if (assetResponse.status < 400 || assetResponse.status === 304) {
          return assetResponse;
        }

        // Handle Next.js /_next/static/ prefix stripping for chunk & css lookup
        if (url.pathname.startsWith('/_next/static/')) {
          const strippedUrl = new URL(request.url);
          strippedUrl.pathname = url.pathname.replace(/^\/_next\/static\//, '/');
          const strippedRes = await env.ASSETS.fetch(new Request(strippedUrl.toString(), request));
          if (strippedRes.status < 400 || strippedRes.status === 304) {
            return strippedRes;
          }
        }
      } catch {
        // Fallback to application shell
      }
    }

    // 5. Application Request Handling & HTML Shell
    return await handleApplicationRequest(request, env);
  }
};

/**
 * Production Next.js Application Request Handler
 * Serves the full interactive Community OS application shell
 */
export async function handleApplicationRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  // If request is for an API route not handled earlier, dispatch it
  if (url.pathname.startsWith('/api/')) {
    const apiRes = await dispatchApiRoute(request, url.pathname, env);
    if (apiRes) return apiRes;
    return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // If an external origin is explicitly configured (not 127.0.0.1 or localhost), proxy to it
  const customOrigin = env.ORIGIN_URL;
  if (customOrigin && !customOrigin.includes('127.0.0.1') && !customOrigin.includes('localhost') && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(new URL(customOrigin).hostname)) {
    try {
      const targetUrl = new URL(url.pathname + url.search, customOrigin);
      const reqHeaders = new Headers(request.headers);
      reqHeaders.set('host', targetUrl.host);
      return await fetch(new Request(targetUrl.toString(), {
        method: request.method,
        headers: reqHeaders,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        redirect: 'manual'
      }));
    } catch {
      // Fallback to native shell
    }
  }

  // Check if ASSETS has index.html for root page
  if (env.ASSETS && (url.pathname === '/' || url.pathname === '')) {
    try {
      const indexReq = new Request(new URL('/index.html', request.url).toString(), request);
      const indexRes = await env.ASSETS.fetch(indexReq);
      if (indexRes.status < 400 || indexRes.status === 304) {
        return indexRes;
      }
    } catch {}
  }

  // Return the complete production Community OS application HTML shell
  return new Response(templateData.html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate'
    }
  });
}

export default worker;
