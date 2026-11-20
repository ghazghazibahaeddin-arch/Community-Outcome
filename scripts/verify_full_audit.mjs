// Community OS — Comprehensive Full-System Audit & Security E2E Verification Suite
// Verifies Phases 1–12 against the running local server (http://localhost:3000)

import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TG_SECRET = (process.env.TELEGRAM_WEBHOOK_SECRET || 'test_secret').trim().replace(/[^A-Za-z0-9_-]/g, '');

let passed = 0;
let failed = 0;
const failures = [];

function check(condition, label, details = '') {
  if (condition) {
    passed++;
    console.log(`[PASS] ${label}`);
  } else {
    failed++;
    failures.push({ label, details });
    console.error(`[FAIL] ${label}${details ? ` — ${details}` : ''}`);
  }
}

async function jsonPost(urlPath, body, cookie = '', extraHeaders = {}) {
  const res = await fetch(`${BASE_URL}${urlPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...extraHeaders
    },
    body: JSON.stringify(body)
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { res, data };
}

async function runAuditSuite() {
  console.log('===================================================================');
  console.log('COMMUNITY OS — FULL AUDIT VERIFICATION SUITE (PHASES 1–12)');
  console.log(`Target: ${BASE_URL}`);
  console.log('===================================================================\n');

  // =========================================================================
  // PHASE 1: PUBLIC ROUTES, SEO, AUTH & SECURITY GUARDS
  // =========================================================================
  console.log('--- Phase 1: Public Routes, Auth, Open Redirect & Rate Limits ---');

  const loginPageRes = await fetch(`${BASE_URL}/auth/login?returnTo=/l/devforge-hub`);
  check(loginPageRes.status === 200, 'Phase 1: Direct route /auth/login returns HTTP 200');

  const signupPageRes = await fetch(`${BASE_URL}/auth/signup`);
  check(signupPageRes.status === 200, 'Phase 1: Direct route /auth/signup returns HTTP 200');

  const privacyPageRes = await fetch(`${BASE_URL}/privacy`);
  check(privacyPageRes.status === 200, 'Phase 1: Public privacy policy /privacy returns HTTP 200');

  const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`);
  const sitemapText = await sitemapRes.text();
  check(
    sitemapRes.status === 200 && sitemapText.includes('<urlset') && sitemapText.includes('/auth/login'),
    'Phase 1: /sitemap.xml generated cleanly with expected URLs'
  );

  const manifestRes = await fetch(`${BASE_URL}/manifest.json`);
  const manifestJson = await manifestRes.json();
  check(
    manifestRes.status === 200 && Boolean(manifestJson.name) && Boolean(manifestJson.start_url),
    'Phase 1: /manifest.json returns valid Web App Manifest JSON'
  );

  // Open redirect sanitization & returnTo preservation in Telegram OIDC + Discord OAuth
  const tgAuthReturnRes = await fetch(
    `${BASE_URL}/api/auth/telegram/authorize?intent=owner&returnTo=/l/devforge-hub`,
    { redirect: 'manual' }
  );
  const tgSetCookie = tgAuthReturnRes.headers.get('set-cookie') || '';
  const tgCookieMatch = tgSetCookie.match(/community_os_tg_oidc_state=([^;]+)/);
  const tgParsedState = tgCookieMatch ? JSON.parse(decodeURIComponent(tgCookieMatch[1])) : null;
  check(
    tgParsedState?.returnTo === '/l/devforge-hub',
    'Phase 1: Telegram OIDC authorize preserves safe internal returnTo in HttpOnly state cookie'
  );

  // Confirm Telegram OIDC callback with intent=owner does NOT escalate user to platformRole=community_owner
  const tgMockCode = `mock_test_oidc_code_${tgParsedState?.nonce || 'nonce'}`;
  const tgCbRes = await fetch(
    `${BASE_URL}/api/auth/telegram/callback?code=${tgMockCode}&state=${tgParsedState?.state}`,
    {
      headers: { Cookie: `community_os_tg_oidc_state=${tgCookieMatch?.[1] || ''}` },
      redirect: 'manual'
    }
  );
  const tgCbLocation = tgCbRes.headers.get('location') || '';
  const tgCbSessionMatch = (tgCbRes.headers.get('set-cookie') || '').match(/community_os_session=([^;]+)/);
  const tgCbSessionCookie = tgCbSessionMatch ? `community_os_session=${tgCbSessionMatch[1]}` : '';
  const tgMeRes = await fetch(`${BASE_URL}/api/auth/me`, { headers: { Cookie: tgCbSessionCookie } });
  const tgMeJson = await tgMeRes.json();
  check(
    tgCbLocation.includes('/l/devforge-hub') && tgMeJson.user?.platformRole === 'user',
    'Phase 1: Telegram OIDC callback honors returnTo and blocks self-escalation to community_owner'
  );

  // Open redirect prevention on evil // returnTo
  const tgEvilReturnRes = await fetch(
    `${BASE_URL}/api/auth/telegram/authorize?returnTo=//evil.example.com/phish`,
    { redirect: 'manual' }
  );
  const tgEvilCookieMatch = (tgEvilReturnRes.headers.get('set-cookie') || '').match(/community_os_tg_oidc_state=([^;]+)/);
  const tgEvilState = tgEvilCookieMatch ? JSON.parse(decodeURIComponent(tgEvilCookieMatch[1])) : null;
  check(
    !tgEvilState?.returnTo || !String(tgEvilState.returnTo).includes('evil.example.com'),
    'Phase 1: Protocol-relative open redirect (//evil.example.com) sanitized out of returnTo'
  );

  // Discord returnTo preservation in state cookie
  const dcReturnRes = await fetch(
    `${BASE_URL}/api/discord/connect?mode=user&returnTo=/l/devforge-request-help`,
    { redirect: 'manual' }
  );
  const dcCookieMatch = (dcReturnRes.headers.get('set-cookie') || '').match(/community_os_dc_oauth_state=([^;]+)/);
  const dcState = dcCookieMatch ? JSON.parse(decodeURIComponent(dcCookieMatch[1])) : null;
  check(
    dcState?.returnTo === '/l/devforge-request-help',
    'Phase 1: Discord OAuth user mode preserves safe returnTo in HttpOnly cookie'
  );

  // =========================================================================
  // AUTH & API HARDENING GUARDS
  // =========================================================================
  console.log('\n--- Security Guards: Auth, Redaction, CSRF, Evidence SSRF/XSS ---');

  const unauthPost = await jsonPost('/api/data', { action: 'create_request', payload: { title: 'x' } });
  check(unauthPost.res.status === 401, 'Security: Unauthenticated POST /api/data rejected with HTTP 401');

  const notFoundCommRes = await fetch(`${BASE_URL}/api/data?communityId=nonexistent_comm_xyz`);
  check(notFoundCommRes.status === 404, 'Security: Nonexistent communityId on GET /api/data returns HTTP 404');

  const guestDataRes = await fetch(`${BASE_URL}/api/data?communityId=comm_devforge`);
  const guestDataJson = await guestDataRes.json();
  const leakedEmail = (guestDataJson.data?.users || []).some((u) => Boolean(u.email));
  check(!leakedEmail, 'Security: Guest GET /api/data redacts user email addresses');

  // Login Sarah (Owner) and sign up a fresh Member & Foreign Owner
  const sarahLogin = await jsonPost('/api/auth/login', {
    email: 'sarah@communityos.org',
    password: 'Password123!'
  });
  const sarahCookie = sarahLogin.res.headers.get('set-cookie')?.split(';')[0] || '';
  check(sarahLogin.res.status === 200 && Boolean(sarahCookie), 'Auth: Seeded owner Sarah signed in');

  const csrfSpoof = await jsonPost(
    '/api/data',
    { action: 'update_passport', payload: { displayName: 'CSRF Test' } },
    sarahCookie,
    { Origin: 'https://evil-attacker.example.com' }
  );
  check(csrfSpoof.res.status === 403, 'Security: Spoofed untrusted Origin header on POST /api/data rejected (403)');

  const memberEmail = `audit_member_${Date.now()}@example.com`;
  const memberSignup = await jsonPost('/api/auth/signup', {
    email: memberEmail,
    password: 'StrongPassword!99',
    name: 'Audit Member',
    role: 'community_owner' // Frontend role spoof attempt MUST be ignored
  });
  const memberCookie = memberSignup.res.headers.get('set-cookie')?.split(';')[0] || '';
  const memberId = memberSignup.data?.user?.id;
  check(
    memberSignup.res.status === 201 && memberSignup.data?.user?.platformRole === 'user',
    'Security: New member signup ignores client role spoof (platformRole stays "user")'
  );

  // =========================================================================
  // PHASE 2: MEMBER WORKFLOWS, REVISION LOOP, APPEAL & ACCOUNT DELETION
  // =========================================================================
  console.log('\n--- Phase 2: Member Workflows, Evidence Validation & Disputes ---');

  const joinRes = await jsonPost('/api/data', { action: 'join_community', payload: { communityId: 'comm_devforge' } }, memberCookie);
  check(joinRes.res.status === 200 && joinRes.data?.success, 'Phase 2: Member joined DevForge Builders');

  // Member leaves then rejoins to verify leave_community persistence; Owner leaving own community must fail
  const leaveRes = await jsonPost('/api/data', { action: 'leave_community', payload: { communityId: 'comm_devforge' } }, memberCookie);
  check(leaveRes.res.status === 200 && leaveRes.data?.success, 'Phase 2: Member left community cleanly');

  const ownerLeaveRes = await jsonPost('/api/data', { action: 'leave_community', payload: { communityId: 'comm_devforge' } }, sarahCookie);
  check(ownerLeaveRes.res.status === 400, 'Phase 2: Owner prevented from abandoning their own community (400)');

  await jsonPost('/api/data', { action: 'join_community', payload: { communityId: 'comm_devforge' } }, memberCookie);

  // Request -> Status Update (Link 19) -> Offer -> Accept Offer -> Evidence Validation -> Revision -> Verify -> Dispute -> Appeal -> Resolve
  const createReq = await jsonPost(
    '/api/data',
    {
      action: 'create_request',
      payload: {
        communityId: 'comm_devforge',
        title: 'Build Real-Time Webhook Retry Telemetry',
        description: 'Deliver structured retry metrics and verifiable PR proof',
        category: 'cat_tech',
        priority: 'high',
        skillsRequired: ['TypeScript'],
        visibility: 'community'
      }
    },
    memberCookie
  );
  const reqId = createReq.data?.result?.id;
  check(createReq.res.status === 200 && Boolean(reqId), 'Phase 2: Member created NeedSignal request');

  const statusUpdate = await jsonPost(
    '/api/data',
    { action: 'update_request_status', payload: { requestId: reqId, status: 'receiving_offers', notes: 'Ready for offers' } },
    memberCookie
  );
  check(statusUpdate.res.status === 200 && statusUpdate.data?.result?.status === 'receiving_offers', 'Phase 2: Request status transition persisted');

  // Submit Offer & Accept
  const offerRes = await jsonPost(
    '/api/data',
    {
      action: 'submit_offer',
      payload: {
        requestId: reqId,
        communityId: 'comm_devforge',
        proposedHelp: 'Full TypeScript implementation + E2E tests'
      }
    },
    memberCookie
  );
  const offerId = offerRes.data?.result?.id;
  check(offerRes.res.status === 200 && Boolean(offerId), 'Phase 2: Specialist offer submitted');

  const acceptOfferRes = await jsonPost('/api/data', { action: 'accept_offer', payload: { offerId } }, memberCookie);
  const taskId = acceptOfferRes.data?.result?.task?.id;
  check(acceptOfferRes.res.status === 200 && Boolean(taskId), 'Phase 2: Accepted offer created QuestLoop task');

  // Direct open task + duplicate claim check
  const directTaskRes = await jsonPost(
    '/api/data',
    {
      action: 'create_task',
      payload: { communityId: 'comm_devforge', title: 'Audit Open Task Claim Race Condition' }
    },
    sarahCookie
  );
  const openTaskId = directTaskRes.data?.result?.id;
  const claim1 = await jsonPost('/api/data', { action: 'claim_task', payload: { taskId: openTaskId } }, memberCookie);
  const claim2 = await jsonPost('/api/data', { action: 'claim_task', payload: { taskId: openTaskId } }, sarahCookie);
  check(claim1.res.status === 200 && claim2.res.status === 409, 'Phase 2: First claim succeeds (200) and duplicate claim blocked (409)');

  // Evidence URL security checks (XSS javascript: + SSRF private IP)
  const xssEvidence = await jsonPost(
    '/api/data',
    { action: 'complete_task', payload: { taskId, evidenceUrl: 'javascript:alert(1)', description: 'XSS attempt' } },
    memberCookie
  );
  const ssrfEvidence = await jsonPost(
    '/api/data',
    { action: 'complete_task', payload: { taskId, evidenceUrl: 'http://127.0.0.1:8080/internal', description: 'SSRF attempt' } },
    memberCookie
  );
  check(
    xssEvidence.res.status === 400 && ssrfEvidence.res.status === 400,
    'Security: Evidence validation rejects javascript: XSS and 127.0.0.1 SSRF URLs (HTTP 400)'
  );

  // Valid deliverable completion
  const completeRes = await jsonPost(
    '/api/data',
    {
      action: 'complete_task',
      payload: {
        taskId,
        evidenceUrl: 'https://github.com/community-os/core/pull/777',
        description: 'Implemented retry telemetry with passing tests'
      }
    },
    memberCookie
  );
  const contribId = completeRes.data?.result?.contribution?.id;
  check(completeRes.res.status === 200 && Boolean(contribId), 'Phase 2: Valid HTTPS deliverable submitted');

  // Full Revision Loop: reviewer requests revision -> contributor resubmits -> reviewer verifies
  const reqRevision = await jsonPost(
    '/api/data',
    {
      action: 'review_contribution',
      payload: {
        contributionId: contribId,
        decision: 'revision_requested',
        reason: 'Please attach the updated benchmark output link'
      }
    },
    sarahCookie
  );
  check(
    reqRevision.res.status === 200 && reqRevision.data?.result?.reviewStatus === 'revision_requested',
    'Phase 2: Reviewer requested revision (status -> revision_requested)'
  );

  const resubmitRes = await jsonPost(
    '/api/data',
    {
      action: 'resubmit_contribution',
      payload: {
        contributionId: contribId,
        evidenceUrl: 'https://github.com/community-os/core/pull/778',
        description: 'Added updated benchmark output link'
      }
    },
    memberCookie
  );
  check(
    resubmitRes.res.status === 200 && resubmitRes.data?.result?.reviewStatus === 'pending',
    'Phase 2: Contributor resubmitted revised evidence (status -> pending)'
  );

  const verifyContrib = await jsonPost(
    '/api/data',
    {
      action: 'review_contribution',
      payload: {
        contributionId: contribId,
        decision: 'verified',
        reason: 'Updated benchmark link verified and accepted'
      }
    },
    sarahCookie
  );
  check(verifyContrib.res.status === 200 && verifyContrib.data?.result?.reviewStatus === 'verified', 'Phase 2: Contribution verified after revision');

  // Re-reviewing an already verified contribution without dispute must be blocked (400)
  const silentReReview = await jsonPost(
    '/api/data',
    {
      action: 'review_contribution',
      payload: { contributionId: contribId, decision: 'rejected', reason: 'Attempt silent reversal' }
    },
    sarahCookie
  );
  check(silentReReview.res.status === 400, 'Phase 2: Verified contributions cannot be silently reverted (400)');

  // Dual-party confirmation (Link 4) by another member (Sarah)
  const secondPartyConfirm = await jsonPost(
    '/api/data',
    { action: 'confirm_contribution_second_party', payload: { contributionId: contribId, note: 'Witnessed delivery in repo' } },
    sarahCookie
  );
  check(
    secondPartyConfirm.res.status === 200 &&
      secondPartyConfirm.data?.result?.secondPartyConfirmed === true &&
      Boolean(secondPartyConfirm.data?.result?.secondPartyId),
    'Phase 2: Dual-party contribution confirmation recorded'
  );

  // Dispute -> Appeal -> Resolution lifecycle
  const fileDispute = await jsonPost(
    '/api/data',
    {
      action: 'file_dispute',
      payload: {
        communityId: 'comm_devforge',
        contributionId: contribId,
        reason: 'Dispute benchmark attribution window',
        evidenceLinks: ['https://github.com/community-os/core/issues/99']
      }
    },
    memberCookie
  );
  const disputeId = fileDispute.data?.result?.id;
  check(fileDispute.res.status === 200 && Boolean(disputeId), 'Phase 2: Dispute filed via Community Shield');

  const appealRes = await jsonPost(
    '/api/data',
    {
      action: 'appeal_dispute',
      payload: {
        disputeId,
        appealNotes: 'Commit timestamps confirm pre-cutoff submission'
      }
    },
    memberCookie
  );
  check(appealRes.res.status === 200 && appealRes.data?.result?.status === 'appealed', 'Phase 2: Member appealed dispute (status -> appealed)');

  const resolveDisputeRes = await jsonPost(
    '/api/data',
    {
      action: 'resolve_dispute',
      payload: {
        disputeId,
        resolution: 'Attribution verified and reinstated cleanly',
        decision: 'resolved'
      }
    },
    sarahCookie
  );
  check(resolveDisputeRes.res.status === 200 && resolveDisputeRes.data?.result?.status === 'resolved', 'Phase 3: Owner resolved appealed dispute');

  // Personal Data Export + Self-Delete Account (on a separate throwaway account so Audit Member remains for remaining checks)
  const throwawaySignup = await jsonPost('/api/auth/signup', {
    email: `delete_me_${Date.now()}@example.com`,
    password: 'DeleteMePass!123',
    name: 'Throwaway User'
  });
  const throwawayCookie = throwawaySignup.res.headers.get('set-cookie')?.split(';')[0] || '';
  const exportRes = await jsonPost('/api/data', { action: 'export_my_data', payload: {} }, throwawayCookie);
  check(exportRes.res.status === 200 && Boolean(exportRes.data?.result?.exportedAt), 'Phase 2: Personal data export returns structured JSON');

  const deleteRes = await jsonPost('/api/data', { action: 'delete_account', payload: {} }, throwawayCookie);
  const deletedMeRes = await fetch(`${BASE_URL}/api/auth/me`, { headers: { Cookie: throwawayCookie } });
  const deletedMeJson = await deletedMeRes.json();
  check(
    deleteRes.res.status === 200 && deleteRes.data?.result?.deleted === true && !deletedMeJson.user,
    'Phase 2: Self-service delete_account purges user and invalidates session'
  );

  // =========================================================================
  // PHASE 3: OWNER ISOLATION, INVITES & AUDIT EXPORT
  // =========================================================================
  console.log('\n--- Phase 3: Tenant Isolation, Invite Limits & Audit Export ---');

  const nonOwnerAuditExport = await jsonPost(
    '/api/data',
    { action: 'export_audit_logs', payload: { communityId: 'comm_devforge' } },
    memberCookie
  );
  const nonOwnerTgChallenge = await jsonPost('/api/telegram/challenge', { communityId: 'comm_devforge' }, memberCookie);
  const nonOwnerDcPublish = await jsonPost(
    '/api/discord/publish-menu',
    { communityId: 'comm_devforge', channelId: 'ch_1' },
    memberCookie
  );
  check(
    nonOwnerAuditExport.res.status === 403 &&
      nonOwnerTgChallenge.res.status === 403 &&
      nonOwnerDcPublish.res.status === 403,
    'Phase 3: Ordinary member blocked (403) from audit export, Telegram challenge, and Discord publish-menu'
  );

  const ownerAuditExport = await jsonPost(
    '/api/data',
    { action: 'export_audit_logs', payload: { communityId: 'comm_devforge', format: 'csv' } },
    sarahCookie
  );
  check(
    ownerAuditExport.res.status === 200 &&
      typeof ownerAuditExport.data?.result?.csv === 'string' &&
      ownerAuditExport.data.result.csv.includes('id,communityId,actorId,action'),
    'Phase 3: Owner audit export returns valid CSV and logs'
  );

  // Invite code maxUses=1 and revocation enforcement
  const invRes = await jsonPost(
    '/api/data',
    { action: 'create_invite_code', payload: { communityId: 'comm_devforge', roleAssigned: 'member', maxUses: 1, expiresInDays: 7 } },
    sarahCookie
  );
  const invCode = invRes.data?.result?.code;
  const invId = invRes.data?.result?.id;
  check(invRes.res.status === 200 && Boolean(invCode), 'Phase 3: Owner created limited invite code (maxUses=1)');

  const redeemOnce = await jsonPost('/api/data', { action: 'redeem_invite_code', payload: { code: invCode } }, memberCookie);
  const redeemTwice = await jsonPost('/api/data', { action: 'redeem_invite_code', payload: { code: invCode } }, tgCbSessionCookie);
  check(
    redeemOnce.res.status === 200 && redeemTwice.res.status === 400,
    'Phase 3: Invite code enforces maxUses=1 (first succeeds, second rejected with 400)'
  );

  const invRevokeCreate = await jsonPost(
    '/api/data',
    { action: 'create_invite_code', payload: { communityId: 'comm_devforge', maxUses: 5 } },
    sarahCookie
  );
  await jsonPost('/api/data', { action: 'revoke_invite_code', payload: { inviteId: invRevokeCreate.data?.result?.id } }, sarahCookie);
  const redeemRevoked = await jsonPost(
    '/api/data',
    { action: 'redeem_invite_code', payload: { code: invRevokeCreate.data?.result?.code } },
    tgCbSessionCookie
  );
  check(redeemRevoked.res.status === 400, 'Phase 3: Revoked invite code strictly rejected (400)');
  if (invId) {
    await jsonPost('/api/data', { action: 'revoke_invite_code', payload: { inviteId: invId } }, sarahCookie);
  }

  // =========================================================================
  // PHASE 4 & 5: DISCORD CRYPTOGRAPHY & TELEGRAM WEBHOOK REAL HANDLERS
  // =========================================================================
  console.log('\n--- Phase 4 & 5: Discord Crypto & Telegram Real Command/Callback Suite ---');

  // Expired timestamp replay test for Discord
  const staleTimestamp = String(Math.floor(Date.now() / 1000) - 600);
  const staleDiscordRes = await fetch(`${BASE_URL}/api/discord/interactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-signature-ed25519': 'a'.repeat(128),
      'x-signature-timestamp': staleTimestamp
    },
    body: JSON.stringify({ type: 1 })
  });
  check(staleDiscordRes.status === 401, 'Phase 5: Discord interactions rejects stale >300s timestamp replay attempts (401)');

  // Telegram commands: /start, /start ar, /hub, /tasks, /mytasks, /passport, /status, XSS /contribution
  const tgHeaders = { 'X-Telegram-Bot-Api-Secret-Token': TG_SECRET };

  const tgStartEn = await jsonPost('/api/telegram/webhook', {
    update_id: 901001,
    message: { chat: { id: 5511001, type: 'private' }, text: '/start', from: { id: 88921029, username: 'tg_member_verified' } }
  }, '', tgHeaders);
  check(
    tgStartEn.res.status === 200 && tgStartEn.data?.method === 'sendMessage' && Array.isArray(tgStartEn.data?.reply_markup?.inline_keyboard),
    'Phase 4: Telegram /start returns interactive inline keyboard synced with Community OS'
  );

  const tgStartAr = await jsonPost('/api/telegram/webhook', {
    update_id: 901002,
    message: { chat: { id: 5511001, type: 'private' }, text: '/start ar', from: { id: 88921029, language_code: 'ar' } }
  }, '', tgHeaders);
  check(
    tgStartAr.res.status === 200 && /[\u0600-\u06FF]/.test(tgStartAr.data?.text || ''),
    'Phase 4: Telegram /start ar responds cleanly in Arabic'
  );

  const tgDuplicate = await jsonPost('/api/telegram/webhook', {
    update_id: 901002,
    message: { chat: { id: 5511001, type: 'private' }, text: '/start ar', from: { id: 88921029 } }
  }, '', tgHeaders);
  check(tgDuplicate.res.status === 200 && tgDuplicate.data?.duplicate === true, 'Phase 4: Duplicate Telegram update_id deduplicated cleanly');

  const tgHub = await jsonPost('/api/telegram/webhook', {
    update_id: 901003,
    message: { chat: { id: 5511001, type: 'private' }, text: '/hub', from: { id: 88921029 } }
  }, '', tgHeaders);
  const tgTasks = await jsonPost('/api/telegram/webhook', {
    update_id: 901004,
    message: { chat: { id: 5511001, type: 'private' }, text: '/tasks', from: { id: 88921029 } }
  }, '', tgHeaders);
  const tgMyTasks = await jsonPost('/api/telegram/webhook', {
    update_id: 901005,
    message: { chat: { id: 5511001, type: 'private' }, text: '/mytasks', from: { id: 88921029 } }
  }, '', tgHeaders);
  const tgPassport = await jsonPost('/api/telegram/webhook', {
    update_id: 901006,
    message: { chat: { id: 5511001, type: 'private' }, text: '/passport', from: { id: 88921029 } }
  }, '', tgHeaders);
  const tgStatus = await jsonPost('/api/telegram/webhook', {
    update_id: 901007,
    message: { chat: { id: 5511001, type: 'private' }, text: '/status', from: { id: 88921029 } }
  }, '', tgHeaders);

  check(
    tgHub.data?.method === 'sendMessage' &&
      tgTasks.data?.method === 'sendMessage' &&
      tgMyTasks.data?.method === 'sendMessage' &&
      tgPassport.data?.method === 'sendMessage' &&
      tgStatus.data?.text?.includes('ONLINE'),
    'Phase 4: Telegram /hub, /tasks, /mytasks, /passport, /status all execute cleanly'
  );

  // Telegram /contribution with malicious javascript: URL rejected cleanly
  const tgXssContrib = await jsonPost('/api/telegram/webhook', {
    update_id: 901008,
    message: {
      chat: { id: 5511001, type: 'private' },
      text: `/contribution ${openTaskId} | javascript:alert(1) | evil proof`,
      from: { id: 88921029 }
    }
  }, '', tgHeaders);
  check(
    tgXssContrib.res.status === 200 && tgXssContrib.data?.text?.includes('Invalid Evidence URL'),
    'Phase 4: Telegram /contribution blocks invalid javascript: URL with clear feedback'
  );

  // Telegram inline callback button menu_tasks
  const tgCbTasks = await jsonPost('/api/telegram/webhook', {
    update_id: 901009,
    callback_query: {
      id: 'cb_audit_tasks_1',
      from: { id: 88921029, username: 'tg_member_verified' },
      message: { chat: { id: 5511001, type: 'private' }, text: 'Menu' },
      data: 'menu_tasks'
    }
  }, '', tgHeaders);
  check(
    tgCbTasks.res.status === 200 && tgCbTasks.data?.method === 'sendMessage' && tgCbTasks.data?.text?.includes('QuestLoop'),
    'Phase 4: Telegram inline callback menu_tasks renders interactive tasks reply'
  );

  // =========================================================================
  // PHASE 6 & 7: PRIVACY CONTROLS & ALL 26 ACTION LINKS
  // =========================================================================
  console.log('\n--- Phase 6 & 7: Privacy Controls & All 26 Action Link Types ---');

  // Privacy: private member profile hides details on /p/[userId] API data check
  await jsonPost(
    '/api/data',
    {
      action: 'update_passport_and_privacy',
      payload: {
        passport: { isPublic: false },
        privacy: { allowDiscovery: false, showBio: false, showSkills: false }
      }
    },
    memberCookie
  );
  const guestViewData = await (await fetch(`${BASE_URL}/api/data?communityId=comm_devforge`)).json();
  const redactedMember = (guestViewData.data?.users || []).find((u) => u.id === memberId);
  check(
    redactedMember && redactedMember.bio === '' && (redactedMember.passport?.skills?.length || 0) === 0,
    'Phase 6: API redacts private member bio & skills for guests'
  );

  // Resolve Action Link enforcement (members_only, revoked, nonexistent)
  const missingSlug = await jsonPost('/api/data', { action: 'resolve_action_link', payload: { slug: 'does-not-exist-404' } });
  check(missingSlug.res.status === 404, 'Phase 7: Nonexistent Action Link slug returns 404');

  // Create and test members_only link rejection for guest
  const membersLinkCreate = await jsonPost(
    '/api/data',
    {
      action: 'create_link',
      payload: {
        communityId: 'comm_devforge',
        linkType: 'link_14_evidence',
        slug: `private-audit-evidence-${Date.now()}`,
        title: 'Private Audit Submission Link',
        description: 'Members only evidence upload',
        audience: 'members_only'
      }
    },
    sarahCookie
  );
  const membersSlug = membersLinkCreate.data?.result?.slug;
  const membersLinkId = membersLinkCreate.data?.result?.id;
  const guestAccessMembersLink = await jsonPost('/api/data', { action: 'resolve_action_link', payload: { slug: membersSlug } });
  const authAccessMembersLink = await jsonPost('/api/data', { action: 'resolve_action_link', payload: { slug: membersSlug } }, memberCookie);
  check(
    guestAccessMembersLink.res.status === 401 && authAccessMembersLink.res.status === 200,
    'Phase 7: members_only Action Link rejects unauth guests (401) and grants signed-in members (200)'
  );

  // Revoke link -> 410 Gone
  await jsonPost('/api/data', { action: 'revoke_link', payload: { linkId: membersLinkId } }, sarahCookie);
  const revokedLinkRes = await jsonPost('/api/data', { action: 'resolve_action_link', payload: { slug: membersSlug } }, memberCookie);
  check(revokedLinkRes.res.status === 410, 'Phase 7: Revoked Action Link returns HTTP 410 Gone');

  // Verify SSR HTTP 200 across seeded Action Link routes + verify all 26 LinkTypes supported in ActionLinkViews.tsx
  const sampleSlugs = [
    'devforge-hub',
    'devforge-request-help',
    'devforge-contribution-ranking',
    'devforge-offer-service',
    'devforge-task-milestones',
    'devforge-community-event',
    'devforge-confirm-contribution',
    'devforge-portable-passport',
    'devforge-outcome-showcase',
    'devforge-knowledge-standards',
    'devforge-bounties',
    'devforge-join-community',
    'devforge-cross-community-help',
    'devforge-issue-report'
  ];
  let slugFailures = 0;
  for (const slug of sampleSlugs) {
    const pageRes = await fetch(`${BASE_URL}/l/${slug}`);
    if (pageRes.status !== 200) slugFailures++;
  }
  check(slugFailures === 0, `Phase 7: All ${sampleSlugs.length} seeded /l/[slug] routes return HTTP 200`);

  // Verify ActionLinkViews.tsx + types/index.ts coverage of all 26 LinkTypes
  const typesSource = fs.readFileSync(path.join(process.cwd(), 'lib', 'types', 'index.ts'), 'utf-8');
  const linkViewsSource = fs.readFileSync(path.join(process.cwd(), 'components', 'ActionLinkViews.tsx'), 'utf-8');
  const linkTypeMatches = [...typesSource.matchAll(/'(link_\d+_[^']+|hub_multipurpose)'/g)].map((m) => m[1]);
  const missingInViews = linkTypeMatches.filter((lt) => !linkViewsSource.includes(lt));
  check(
    linkTypeMatches.length >= 25 && missingInViews.length === 0,
    `Phase 7: All ${linkTypeMatches.length} LinkType variants handled in ActionLinkViews.tsx (missing: ${missingInViews.length})`,
    missingInViews.join(', ')
  );

  // =========================================================================
  // RATE LIMIT CHECK (Using isolated synthetic X-Forwarded-For IP)
  // =========================================================================
  console.log('\n--- Security: Per-IP Rate Limit Enforcement & Clean Seed Restore ---');
  let got429 = false;
  for (let i = 0; i < 24; i++) {
    const attempt = await jsonPost(
      '/api/auth/login',
      { email: 'ratelimit_probe@example.com', password: 'wrong' },
      '',
      { 'X-Forwarded-For': '203.0.113.250' }
    );
    if (attempt.res.status === 429) {
      got429 = true;
      break;
    }
  }
  check(got429, 'Security: /api/auth/login enforces sliding-window rate limit (HTTP 429)');

  // Restore demo seed so workspace returns cleanly to baseline seeded state
  const restoreRes = await jsonPost('/api/data', { action: 'restore_demo_seed', payload: { communityId: 'comm_devforge' } }, sarahCookie);
  check(restoreRes.res.status === 200 && restoreRes.data?.success, 'Cleanup: Restored clean demo seed database state');

  console.log('\n===================================================================');
  console.log(`AUDIT VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===================================================================');
  if (failed > 0) {
    console.error('Failures:', JSON.stringify(failures, null, 2));
    process.exit(1);
  }
  process.exit(0);
}

runAuditSuite().catch((err) => {
  console.error('Fatal error running audit suite:', err);
  process.exit(1);
});
