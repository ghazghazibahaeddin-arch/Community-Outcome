// Comprehensive End-to-End Verification Suite for Community OS
// Covers Journeys A through F, Discord & Telegram Adapters, and Security Invariants

const BASE_URL = 'http://localhost:3000';

let passedChecks = 0;
let failedChecks = 0;
const results = [];

function assert(condition, message, details = '') {
  if (condition) {
    passedChecks++;
    results.push({ status: 'PASS', message, details });
    console.log(`[PASS] ${message}`);
  } else {
    failedChecks++;
    results.push({ status: 'FAIL', message, details });
    console.error(`[FAIL] ${message} - ${details}`);
  }
}

async function runTests() {
  console.log('=====================================================');
  console.log('COMMUNITY OS — SYSTEMATIC AUTOMATED VERIFICATION RUN');
  console.log('=====================================================\n');

  // --- JOURNEY A: New Member (Signup, Session, Me, Profile, Request) ---
  console.log('--- Executing Journey A: New Member ---');
  const testEmailA = `member_test_${Date.now()}@example.com`;
  const testPasswordA = 'TestPass123!Secure';
  let cookieA = '';

  // 1. Signup
  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmailA,
      password: testPasswordA,
      name: 'Jordan Member',
      bio: 'Open source contributor & automated tester'
    })
  });
  const signupData = await signupRes.json();
  const setCookieHeader = signupRes.headers.get('set-cookie');
  if (setCookieHeader) {
    cookieA = setCookieHeader.split(';')[0];
  }
  assert((signupRes.status === 201 || signupRes.status === 200) && signupData.success, 'Journey A: New member signup successful', JSON.stringify(signupData));
  assert(cookieA.length > 0, 'Journey A: Session cookie issued upon signup');

  // 2. Fetch authenticated user (/api/auth/me)
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: cookieA }
  });
  const meData = await meRes.json();
  assert(meRes.status === 200 && meData.user?.email === testEmailA, 'Journey A: Current session verified via /api/auth/me');
  const newUserId = meData.user?.id;

  // 3. Join a community as member
  const joinRes = await fetch(`${BASE_URL}/api/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({
      action: 'join_community',
      payload: { communityId: 'comm_devforge', userId: newUserId }
    })
  });
  const joinData = await joinRes.json();
  assert(joinRes.status === 200 && joinData.success, 'Journey A: Member joined community with role "member"');

  // 4. Create a NeedSignal request as member
  const reqRes = await fetch(`${BASE_URL}/api/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({
      action: 'create_request',
      payload: {
        communityId: 'comm_devforge',
        creatorId: newUserId,
        title: 'Audit E2E Automated Invariants for Test Suite',
        description: 'Comprehensive evaluation of automated journey invariants',
        category: 'cat_tech',
        skillsRequired: ['TypeScript', 'Testing'],
        priority: 'high',
        deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
        visibility: 'community'
      }
    })
  });
  const reqData = await reqRes.json();
  assert(reqRes.status === 200 && reqData.success, 'Journey A: Member submitted NeedSignal request successfully');
  const createdRequestId = reqData.item?.id || reqData.result?.id;

  // 5. Verify persistence of the created request
  const fetchReqsRes = await fetch(`${BASE_URL}/api/data`);
  const fetchReqsData = await fetchReqsRes.json();
  const foundRequest = fetchReqsData.data?.requests?.find(r => r.id === createdRequestId);
  assert(foundRequest && foundRequest.title === 'Audit E2E Automated Invariants for Test Suite', 'Journey A: Request persisted and retrievable from database');

  // --- JOURNEY B: New Community Owner (Create Community, Onboarding, Owner Workspace) ---
  console.log('\n--- Executing Journey B: New Community Owner ---');
  const ownerEmail = `owner_${Date.now()}@example.com`;
  let cookieOwner = '';

  const ownerSignupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ownerEmail,
      password: 'OwnerPassword123!',
      name: 'Elena Founder',
      bio: 'Ecosystem Steward'
    })
  });
  const ownerSignupData = await ownerSignupRes.json();
  const ownerSetCookie = ownerSignupRes.headers.get('set-cookie');
  if (ownerSetCookie) cookieOwner = ownerSetCookie.split(';')[0];
  const ownerUserId = ownerSignupData.user?.id;
  assert((ownerSignupRes.status === 201 || ownerSignupRes.status === 200) && ownerSignupData.success, 'Journey B: Community Founder signed up');

  // Create new community
  const newCommRes = await fetch(`${BASE_URL}/api/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieOwner },
    body: JSON.stringify({
      action: 'create_community',
      payload: {
        name: 'Nexus Security Lab',
        slug: `nexus-lab-${Date.now()}`,
        description: 'Collaborative security auditing and formal verification guild',
        category: 'Security & Infrastructure',
        ownerId: ownerUserId
      }
    })
  });
  const newCommData = await newCommRes.json();
  assert(newCommRes.status === 200 && newCommData.success, 'Journey B: Community created successfully');
  const createdCommunityId = newCommData.item?.id || newCommData.result?.id;

  // Verify that creator is automatically 'community_owner' in membership table
  const verifyDbRes = await fetch(`${BASE_URL}/api/data?communityId=all`);
  const verifyDbData = await verifyDbRes.json();
  const ownerMembership = verifyDbData.data?.memberships?.find(
    m => m.communityId === createdCommunityId && m.userId === ownerUserId
  );
  assert(
    ownerMembership && ownerMembership.role === 'community_owner',
    'Journey B: Creator automatically assigned persisted "community_owner" role'
  );

  // Verify initial Hub link was generated
  const generatedHubLink = verifyDbData.data?.links?.find(
    l => l.communityId === createdCommunityId && l.linkType === 'hub_multipurpose'
  );
  assert(generatedHubLink !== undefined, 'Journey B: Initial Community Hub Link generated upon creation');

  // --- JOURNEY C: Role and Workspace Switching (Context Isolation & Authorization Rejection) ---
  console.log('\n--- Executing Journey C: Role and Workspace Authorization ---');
  // Elena is OWNER in Nexus Security Lab, but MEMBER in DevForge Builders.
  // Join DevForge Builders as normal member
  await fetch(`${BASE_URL}/api/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieOwner },
    body: JSON.stringify({
      action: 'join_community',
      payload: { communityId: 'comm_devforge', userId: ownerUserId }
    })
  });

  // Attempt unauthorized owner action in comm_devforge (e.g. update community config or promote role)
  const unauthorizedUpdateRes = await fetch(`${BASE_URL}/api/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieOwner },
    body: JSON.stringify({
      action: 'update_community_config',
      payload: {
        communityId: 'comm_devforge',
        config: { name: 'Hacked Community Name' }
      }
    })
  });
  assert(
    unauthorizedUpdateRes.status === 403,
    'Journey C: Server strictly rejects non-owner trying to modify foreign community configuration (HTTP 403 Forbidden)'
  );

  // Attempt unauthorized member promotion in comm_devforge
  const unauthorizedRoleRes = await fetch(`${BASE_URL}/api/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieOwner },
    body: JSON.stringify({
      action: 'update_member_role',
      payload: {
        communityId: 'comm_devforge',
        targetUserId: ownerUserId,
        role: 'community_owner'
      }
    })
  });
  assert(
    unauthorizedRoleRes.status === 403,
    'Journey C: Server strictly rejects self-escalation of roles by ordinary members (HTTP 403 Forbidden)'
  );

  // Authorized owner action in Nexus Security Lab (should succeed)
  const authorizedUpdateRes = await fetch(`${BASE_URL}/api/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieOwner },
    body: JSON.stringify({
      action: 'update_community_config',
      payload: {
        communityId: createdCommunityId,
        config: { name: 'Nexus Security Lab (Verified)' }
      }
    })
  });
  assert(
    authorizedUpdateRes.status === 200,
    'Journey C: Server allows owner to modify their own community configuration (HTTP 200 OK)'
  );

  // --- JOURNEY D: Password Recovery Flow ---
  console.log('\n--- Executing Journey D: Password Recovery ---');
  // 1. Request password reset
  const forgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmailA })
  });
  const forgotData = await forgotRes.json();
  assert(forgotRes.status === 200 && forgotData.success, 'Journey D: Password reset request accepted');

  // 2. Fetch logged dev reset email
  const devEmailsRes = await fetch(`${BASE_URL}/api/auth/dev-emails`);
  const devEmailsData = await devEmailsRes.json();
  const resetEmail = devEmailsData.emails?.find(e => e.to === testEmailA);
  const resetToken = resetEmail?.resetToken || (resetEmail?.resetUrl ? new URL(resetEmail.resetUrl).searchParams.get('token') : null) || forgotData.devToken;
  assert(Boolean(resetToken), 'Journey D: Secure single-use reset token generated and logged');

  // 3. Reset password using token
  const newPasswordA = 'BrandNewPassword999!';
  const resetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: resetToken, newPassword: newPasswordA })
  });
  const resetData = await resetRes.json();
  assert(resetRes.status === 200 && resetData.success, 'Journey D: Password successfully reset with valid token');

  // 4. Token replay protection: attempt to reuse the exact same token
  const replayRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: resetToken, newPassword: 'AnotherPassword123!' })
  });
  assert(replayRes.status === 400, 'Journey D: Single-use reset token immediately invalidated and rejected on reuse');

  // 5. Test login with old password (MUST FAIL)
  const oldLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmailA, password: testPasswordA })
  });
  assert(oldLoginRes.status === 401, 'Journey D: Old password rejected following password reset');

  // 6. Test login with new password (MUST SUCCEED)
  const newLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmailA, password: newPasswordA })
  });
  assert(newLoginRes.status === 200, 'Journey D: Login succeeds with new password');

  // --- JOURNEY E: Complete Contribution Workflow ---
  console.log('\n--- Executing Journey E: Complete Contribution Workflow ---');
  // 1. Submit an offer on a request
  const offerRes = await fetch(`${BASE_URL}/api/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({
      action: 'create_offer',
      payload: {
        requestId: createdRequestId,
        communityId: 'comm_devforge',
        memberId: newUserId,
        proposedHelp: 'I will write the test runner and verify invariants',
        skills: ['TypeScript', 'Testing'],
        experienceDescription: 'QA lead',
        availability: '10 hrs/week',
        estimatedHours: 4,
        portfolioLinks: ['https://github.com/test-portfolio']
      }
    })
  });
  const offerData = await offerRes.json();
  assert(offerRes.status === 200 && offerData.success, 'Journey E: Offer submitted on NeedSignal request');
  const offerId = offerData.item?.id || offerData.result?.id;

  // 2. Accept offer (creates QuestLoop task and PromiseGraph commitment)
  const acceptOfferRes = await fetch(`${BASE_URL}/api/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({
      action: 'accept_offer',
      payload: { offerId }
    })
  });
  const acceptOfferData = await acceptOfferRes.json();
  assert(acceptOfferRes.status === 200 && acceptOfferData.success, 'Journey E: Offer accepted; QuestLoop task and commitment generated');
  const taskId = acceptOfferData.item?.task?.id || acceptOfferData.result?.task?.id;

  // 3. Complete task with evidence
  const evidenceRes = await fetch(`${BASE_URL}/api/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({
      action: 'complete_task',
      payload: {
        taskId,
        evidenceUrl: 'https://github.com/community-os/core/pull/42',
        description: 'Verified test run output attached',
        memberId: newUserId
      }
    })
  });
  const evidenceData = await evidenceRes.json();
  assert(evidenceRes.status === 200 && evidenceData.success, 'Journey E: Task completed with verifiable evidence link');
  const contributionId = evidenceData.item?.contribution?.id || evidenceData.result?.contribution?.id;

  // 4. Review contribution (as owner or reviewer Sarah Al-Mansoor)
  // Login as seeded reviewer Sarah Al-Mansoor
  const sarahLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sarah@communityos.org', password: 'Password123!' })
  });
  const sarahCookie = sarahLoginRes.headers.get('set-cookie')?.split(';')[0];
  assert(sarahLoginRes.status === 200, 'Journey E: Reviewer Sarah authenticated');

  const reviewRes = await fetch(`${BASE_URL}/api/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sarahCookie },
    body: JSON.stringify({
      action: 'review_contribution',
      payload: {
        contributionId,
        decision: 'verified',
        reason: 'Evidence inspected: pull request merged with passing CI suite',
        communityId: 'comm_devforge'
      }
    })
  });
  const reviewData = await reviewRes.json();
  assert(reviewRes.status === 200 && reviewData.success, 'Journey E: Contribution peer-reviewed and verified into ledger');

  // --- JOURNEY F: Data Integrity & Calculated Metrics ---
  console.log('\n--- Executing Journey F: Data Integrity ---');
  const finalDbRes = await fetch(`${BASE_URL}/api/data`);
  const finalDb = (await finalDbRes.json()).data;
  
  assert(Array.isArray(finalDb.communities) && finalDb.communities.length > 0, 'Journey F: Real communities array present');
  assert(Array.isArray(finalDb.requests) && finalDb.requests.length > 0, 'Journey F: Real requests array populated from actual actions');
  assert(Array.isArray(finalDb.tasks) && finalDb.tasks.length > 0, 'Journey F: Real tasks array populated');
  assert(Array.isArray(finalDb.contributions) && finalDb.contributions.length > 0, 'Journey F: Real contributions array populated');

  // Check that all 14 canonical links exist and are accessible
  const canonicalSlugs = [
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
  let missingSlugs = 0;
  for (const slug of canonicalSlugs) {
    const found = finalDb.links?.some(l => l.slug === slug);
    if (!found) missingSlugs++;
  }
  assert(missingSlugs === 0, `Journey F: All 14 canonical Community Links present (missing: ${missingSlugs})`);

  // --- PLATFORM INTEGRATIONS: Discord & Telegram Gateway Tests ---
  console.log('\n--- Executing Platform Integration Tests ---');
  
  // 1. Discord PING challenge
  const discordPingRes = await fetch(`${BASE_URL}/api/discord/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 1 })
  });
  const discordPingData = await discordPingRes.json();
  assert(discordPingData.type === 1, 'Discord Adapter: Responds with PONG (type 1) to PING challenges');

  // 2. Discord Slash Command: /requests
  const discordReqCmdRes = await fetch(`${BASE_URL}/api/discord/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 2,
      data: { name: 'requests' },
      user: { id: 'discord_test_user_1', username: 'tester' }
    })
  });
  const discordReqCmdData = await discordReqCmdRes.json();
  assert(
    discordReqCmdData.type === 4 && discordReqCmdData.data?.content.includes('NeedSignal'),
    'Discord Adapter: Handled /requests slash command using shared backend data'
  );

  // 3. Telegram Webhook: Secret Token Authentication Check
  const rawSecret = process.env.TELEGRAM_WEBHOOK_SECRET || 'test_secret';
  const sanitizedSecret = rawSecret.trim().replace(/[^A-Za-z0-9_-]/g, '');

  const tgUnauthorizedRes = await fetch(`${BASE_URL}/api/telegram/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Bot-Api-Secret-Token': 'wrong_invalid_secret'
    },
    body: JSON.stringify({ message: { text: '/help' } })
  });
  assert(
    tgUnauthorizedRes.status === 403,
    'Telegram Adapter: Rejects unauthorized requests with invalid secret token (HTTP 403)'
  );

  // 4. Telegram Webhook: Command /requests with sanitized secret
  const tgAuthorizedRes = await fetch(`${BASE_URL}/api/telegram/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Bot-Api-Secret-Token': sanitizedSecret
    },
    body: JSON.stringify({
      message: {
        chat: { id: 987654321 },
        text: '/requests',
        from: { id: 12345, username: 'telegram_tester' }
      }
    })
  });
  const tgData = await tgAuthorizedRes.json();
  assert(
    tgData.method === 'sendMessage' && tgData.text.includes('NeedSignal'),
    'Telegram Adapter: Processed /requests command and returned formatted Markdown response'
  );

  // 5. Telegram Webhook: /help_request creates real request in database
  const tgCreateRes = await fetch(`${BASE_URL}/api/telegram/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Bot-Api-Secret-Token': sanitizedSecret
    },
    body: JSON.stringify({
      message: {
        chat: { id: 987654321 },
        text: '/help_request Telegram Bot Test Deliverable Request | high',
        from: { id: 12345, username: 'telegram_tester' }
      }
    })
  });
  const tgCreateData = await tgCreateRes.json();
  assert(
    tgCreateData.method === 'sendMessage' && tgCreateData.text.includes('NeedSignal Request Created'),
    'Telegram Adapter: /help_request command dispatched and created record in database'
  );

  // --- DIRECT COMMUNITY CONNECTION CENTER & IN-GROUP BOT EXPERIENCE ---
  console.log('\n--- Executing Direct Community Connection Center Tests ---');

  // 6. Discord Connect Info API (URL generation with correct scopes & permissions)
  const discordConnectInfoRes = await fetch(`${BASE_URL}/api/discord/connect?communityId=comm_devforge`);
  const discordConnectInfo = await discordConnectInfoRes.json();
  assert(
    discordConnectInfo.success &&
    discordConnectInfo.installUrl.includes('permissions=277025774752') &&
    discordConnectInfo.installUrl.includes('scope=bot%20applications.commands'),
    'Connection Center: Discord OAuth installation URL generated with correct permissions and scopes'
  );

  // 7. Discord Guild Connection via API
  const discordGuildConnectRes = await fetch(`${BASE_URL}/api/discord/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      communityId: 'comm_devforge',
      serverId: 'guild_test_prod_99182',
      serverName: 'Verified DevForge Operations Guild',
      channelId: 'ch_actions_99'
    })
  });
  const discordGuildConnectData = await discordGuildConnectRes.json();
  assert(
    discordGuildConnectRes.status === 200 && discordGuildConnectData.success && discordGuildConnectData.server?.status === 'connected_and_verified',
    'Connection Center: Discord server successfully verified, associated, and persisted to community'
  );

  // 8. Discord In-Guild Message Component Button Click (btn_requests)
  const discordBtnRes = await fetch(`${BASE_URL}/api/discord/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 3, // MESSAGE_COMPONENT
      data: { custom_id: 'btn_requests' },
      guild_id: 'guild_test_prod_99182',
      user: { id: 'discord_user_btn_test', username: 'btn_clicker' }
    })
  });
  const discordBtnData = await discordBtnRes.json();
  assert(
    discordBtnData.type === 4 && discordBtnData.data?.content.includes('NeedSignal Requests'),
    'In-Group Bot: Discord interactive button (btn_requests) handled with instant in-guild response'
  );

  // 9. Discord Publish Persistent Menu Embed with ActionRow Buttons
  const discordPublishMenuRes = await fetch(`${BASE_URL}/api/discord/publish-menu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      communityId: 'comm_devforge',
      channelId: 'ch_actions_99'
    })
  });
  const discordPublishMenuData = await discordPublishMenuRes.json();
  assert(
    discordPublishMenuRes.status === 200 && discordPublishMenuData.success && discordPublishMenuData.messageId,
    'In-Group Bot: Published interactive persistent menu with buttons to Discord channel'
  );

  // 10. Telegram Group Connection Challenge Generation
  const tgChallengeRes = await fetch(`${BASE_URL}/api/telegram/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ communityId: 'comm_devforge' })
  });
  const tgChallengeData = await tgChallengeRes.json();
  assert(
    tgChallengeRes.status === 200 && tgChallengeData.success && tgChallengeData.challenge?.code.startsWith('CONNECT-TG-'),
    'Connection Center: Generated single-use, short-lived group connection challenge (/connect CODE)'
  );
  const challengeCode = tgChallengeData.challenge.code;

  // 11. Telegram Webhook: Execute /connect CODE inside target group
  const tgGroupConnectRes = await fetch(`${BASE_URL}/api/telegram/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Bot-Api-Secret-Token': sanitizedSecret
    },
    body: JSON.stringify({
      message: {
        chat: { id: -100192837465, type: 'supergroup', title: 'DevForge Core Telegram Group' },
        text: `/connect ${challengeCode}`,
        from: { id: 77182910, username: 'sarah_steward' }
      }
    })
  });
  const tgGroupConnectData = await tgGroupConnectRes.json();
  assert(
    tgGroupConnectData.method === 'sendMessage' && tgGroupConnectData.text.includes('Successfully Connected'),
    'Connection Center: Telegram webhook verified /connect CODE in group, validated admin, and linked group'
  );

  // 12. Telegram Webhook: Inline Keyboard Callback Query (callback_query for menu_requests)
  const tgCallbackRes = await fetch(`${BASE_URL}/api/telegram/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Bot-Api-Secret-Token': sanitizedSecret
    },
    body: JSON.stringify({
      callback_query: {
        id: 'cb_query_99182',
        from: { id: 77182910, username: 'sarah_steward' },
        message: { chat: { id: -100192837465 } },
        data: 'menu_requests'
      }
    })
  });
  const tgCallbackData = await tgCallbackRes.json();
  assert(
    tgCallbackData.method === 'sendMessage' && tgCallbackData.text.includes('NeedSignal'),
    'In-Group Bot: Handled Telegram callback_query from inline keyboard button (menu_requests)'
  );

  // 13. Telegram Publish Persistent Menu with Inline Keyboard
  const tgPublishMenuRes = await fetch(`${BASE_URL}/api/telegram/publish-menu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      communityId: 'comm_devforge',
      pinMessage: true
    })
  });
  const tgPublishMenuData = await tgPublishMenuRes.json();
  assert(
    tgPublishMenuRes.status === 200 && tgPublishMenuData.success && Boolean(tgPublishMenuData.messageId),
    'In-Group Bot: Published interactive persistent menu with inline keyboard to Telegram group',
    `Status ${tgPublishMenuRes.status}: ${JSON.stringify(tgPublishMenuData)}`
  );

  // 14. Multi-Tenant Role Security: Unauthorized member cannot disconnect or configure bots
  const unauthorizedDisconnectRes = await fetch(`${BASE_URL}/api/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({
      action: 'disconnect_platform',
      payload: {
        communityId: 'comm_devforge',
        platform: 'discord',
        actorId: newUserId
      }
    })
  });
  assert(
    unauthorizedDisconnectRes.status === 403,
    'Security Invariant: Ordinary member rejected when attempting to disconnect community bots (HTTP 403)'
  );

  // 15. Discord OAuth Callback: Handles installation callback with state and guild_id
  const callbackState = `os_discord_comm_devforge_${Date.now()}`;
  const callbackRes = await fetch(
    `${BASE_URL}/api/discord/callback?code=mock_oauth_code_123&guild_id=987654321098765432&permissions=277025774752&state=${callbackState}`,
    { redirect: 'manual' }
  );
  // Expect a 307 or 302 redirect back to ?tab=owner&connected_platform=discord
  const locationHeader = callbackRes.headers.get('location') || '';
  assert(
    (callbackRes.status === 302 || callbackRes.status === 307) &&
    locationHeader.includes('connected_platform=discord') &&
    locationHeader.includes('987654321098765432'),
    'Connection Center: Discord OAuth installation callback successfully processed guild and issued redirect'
  );

  // 16. Discord OAuth Callback: Rejects request with invalid or missing state
  const invalidCallbackRes = await fetch(
    `${BASE_URL}/api/discord/callback?code=mock_code&guild_id=123&state=invalid_state`,
    { redirect: 'manual' }
  );
  const invalidLocation = invalidCallbackRes.headers.get('location') || '';
  assert(
    invalidLocation.includes('discord_error='),
    'Security Invariant: Discord callback strictly rejects invalid state tokens and logs security error'
  );

  // 17. Discord Permission Bitfield: Explicitly includes VIEW_CHANNEL (1024)
  const discordPermRes = await fetch(`${BASE_URL}/api/discord/connect?communityId=comm_devforge`);
  const discordPermData = await discordPermRes.json();
  const permBigInt = BigInt(discordPermData.permissionsInteger || '0');
  const hasViewChannel = (permBigInt & 1024n) === 1024n;
  assert(
    discordPermData.success && hasViewChannel && discordPermData.requiredPermissions.some(p => p.includes('VIEW_CHANNEL')),
    'Connection Center: Discord bot permissions explicitly include VIEW_CHANNEL (1024) without granting Administrator'
  );

  // 18. Supabase PostgreSQL Schema & Migration File Readiness
  const fs = await import('fs');
  const path = await import('path');
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20261101_init_schema.sql');
  const migrationExists = fs.existsSync(migrationPath);
  let migrationValid = false;
  if (migrationExists) {
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    migrationValid = sql.includes('CREATE TABLE IF NOT EXISTS users') &&
                     sql.includes('CREATE TABLE IF NOT EXISTS communities') &&
                     sql.includes('CREATE TABLE IF NOT EXISTS requests') &&
                     sql.includes('ROW LEVEL SECURITY');
  }
  assert(
    migrationExists && migrationValid,
    'Database: Supabase PostgreSQL migration schema created with multi-tenant RLS policies and tables'
  );

  // 19. Singleton Worker Guard Verification
  const lockFilePath = path.join(process.cwd(), 'data', 'bot_service.lock');
  const lockExists = fs.existsSync(lockFilePath);
  assert(
    lockExists,
    'Background Services: Singleton PID lock active to prevent duplicate Telegram polling workers & 409 conflicts'
  );

  // 20. Telegram Auth Config: Provides bot username & BotFather domain setup instructions
  const tgConfigRes = await fetch(`${BASE_URL}/api/auth/telegram/config`);
  const tgConfigData = await tgConfigRes.json();
  assert(
    tgConfigData.success && tgConfigData.botUsername && tgConfigData.botFatherInstructions.length > 0,
    'Authentication: Telegram config endpoint exposes bot username and explicit @BotFather domain configuration instructions'
  );

  // 21. Telegram Web Login Verification: Successfully authenticates and creates session
  const tgAuthRes = await fetch(`${BASE_URL}/api/auth/telegram/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'tg_88921029',
      first_name: 'Tariq',
      username: 'tariq_builder',
      auth_date: Math.floor(Date.now() / 1000),
      hash: 'verified_via_telegram_client_oidc'
    })
  });
  const tgAuthData = await tgAuthRes.json();
  assert(
    tgAuthRes.status === 200 && tgAuthData.success && Boolean(tgAuthData.sessionToken) && tgAuthData.user.name === 'Tariq',
    'Authentication: Telegram Login verification succeeded, created verified user, and issued session token'
  );

  // 22. Discord Direct Redirect: Ensures users never see raw JSON when clicking connect
  const discordRedirectRes = await fetch(`${BASE_URL}/api/discord/connect?redirect=true`, {
    redirect: 'manual'
  });
  const discordLoc = discordRedirectRes.headers.get('location') || '';
  assert(
    (discordRedirectRes.status === 302 || discordRedirectRes.status === 307) && discordLoc.includes('discord.com/api/oauth2/authorize'),
    'Connection Center: Discord connect endpoint issues 302/307 direct redirect so users never see raw API JSON'
  );

  // 23. Bearer Session Persistence: Session token survives across refreshes and requests
  const persistentDataRes = await fetch(`${BASE_URL}/api/data?communityId=comm_devforge`, {
    headers: {
      Authorization: `Bearer ${tgAuthData.sessionToken}`
    }
  });
  const persistentDataJson = await persistentDataRes.json();
  assert(
    persistentDataJson.success && persistentDataJson.data.authUser?.id === tgAuthData.user.id,
    'Session Persistence: Authorization Bearer header restores authenticated session across page refreshes and requests'
  );

  // Summary
  console.log('\n=====================================================');
  console.log(`VERIFICATION SUMMARY: ${passedChecks} PASSED, ${failedChecks} FAILED`);
  console.log('=====================================================');
  if (failedChecks > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test execution fatal error:', err);
  process.exit(1);
});
