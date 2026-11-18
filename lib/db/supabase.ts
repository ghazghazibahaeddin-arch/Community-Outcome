// Community OS — Supabase PostgreSQL Client & Multi-Tenant Adapter
// Server-side only: never expose service role key to browser

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getRuntimeEnv, CloudflareEnv } from '../env';

let supabaseInstance: SupabaseClient | null = null;
let supabaseCacheKey: string | null = null;

export function isSupabaseConfigured(explicitEnv?: CloudflareEnv): boolean {
  const env = getRuntimeEnv(explicitEnv);
  const url = env.SUPABASE_URL;
  const key =
    env.SUPABASE_SECRET_KEY ||
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_ANON_KEY;
  return Boolean(url && url.trim().length > 0 && key && key.trim().length > 0 && !url.includes('your-project'));
}

export function getSupabaseClient(explicitEnv?: CloudflareEnv): SupabaseClient | null {
  const env = getRuntimeEnv(explicitEnv);
  const url = env.SUPABASE_URL?.trim();
  const key = (
    env.SUPABASE_SECRET_KEY ||
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_ANON_KEY
  )?.trim();

  if (!url || !key || url.includes('your-project')) {
    return null;
  }

  const nextCacheKey = `${url}:${key.slice(0, 12)}`;
  if (supabaseInstance && supabaseCacheKey === nextCacheKey) {
    return supabaseInstance;
  }

  try {
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    supabaseCacheKey = nextCacheKey;
    return supabaseInstance;
  } catch (err) {
    console.error('[Supabase Init Error]:', err);
    return null;
  }
}

export async function deleteSessionFromSupabase(token: string, explicitEnv?: CloudflareEnv): Promise<void> {
  const client = getSupabaseClient(explicitEnv);
  if (!client || !token) return;
  try {
    await client.from('auth_sessions').delete().eq('token', token);
  } catch (err: any) {
    console.warn('[Supabase Session Delete Warning]:', err?.message || err);
  }
}

export async function deleteUserSessionsFromSupabase(userId: string, explicitEnv?: CloudflareEnv): Promise<void> {
  const client = getSupabaseClient(explicitEnv);
  if (!client || !userId) return;
  try {
    await client.from('auth_sessions').delete().eq('user_id', userId);
  } catch (err: any) {
    console.warn('[Supabase User Sessions Delete Warning]:', err?.message || err);
  }
}

/**
 * Sync in-memory/JSON store with Supabase PostgreSQL
 */
export async function syncDatabaseToSupabase(dbData: any, explicitEnv?: CloudflareEnv): Promise<{ success: boolean; syncedCount: number; error?: string }> {
  const client = getSupabaseClient(explicitEnv);
  if (!client) {
    return { success: false, syncedCount: 0, error: 'Supabase credentials not configured' };
  }

  let count = 0;
  try {
    // 1. Sync Users
    if (Array.isArray(dbData.users) && dbData.users.length > 0) {
      const usersToUpsert = dbData.users.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar || null,
        bio: u.bio || null,
        platform_role: u.platformRole || 'user',
        created_at: u.createdAt || new Date().toISOString(),
        identities: u.identities || {},
        passport: u.passport || {},
        privacy: u.privacy || {}
      }));
      const { error } = await client.from('users').upsert(usersToUpsert, { onConflict: 'id' });
      if (error) console.warn('[Supabase Sync] Users upsert warning:', error.message);
      else count += usersToUpsert.length;
    }

    // 1b. Sync Auth Accounts (only for existing userIds)
    if (Array.isArray(dbData.authAccounts) && dbData.authAccounts.length > 0) {
      const userIds = new Set((dbData.users || []).map((u: any) => u.id));
      const accountsToUpsert = dbData.authAccounts
        .filter((a: any) => userIds.has(a.id))
        .map((a: any) => ({
          id: a.id,
          user_id: a.id,
          email: a.email,
          password_hash: a.passwordHash || null,
          salt: a.salt || null,
          password_reset_token: a.resetToken || null,
          password_reset_expires_at: a.resetTokenExpiry || null,
          created_at: a.createdAt || new Date().toISOString()
        }));
      if (accountsToUpsert.length > 0) {
        const { error } = await client.from('auth_accounts').upsert(accountsToUpsert, { onConflict: 'id' });
        if (error) console.warn('[Supabase Sync] Auth accounts upsert warning:', error.message);
        else count += accountsToUpsert.length;
      }
    }

    // 1c. Sync Auth Sessions
    if (Array.isArray(dbData.sessions) && dbData.sessions.length > 0) {
      const userIds = new Set((dbData.users || []).map((u: any) => u.id));
      const sessionsToUpsert = dbData.sessions
        .filter((s: any) => s.token && userIds.has(s.userId))
        .map((s: any) => ({
          id: s.token,
          user_id: s.userId,
          token: s.token,
          expires_at: s.expiresAt || new Date(Date.now() + 7 * 86400000).toISOString(),
          created_at: s.createdAt || new Date().toISOString()
        }));
      if (sessionsToUpsert.length > 0) {
        const { error } = await client.from('auth_sessions').upsert(sessionsToUpsert, { onConflict: 'token' });
        if (error) console.warn('[Supabase Sync] Auth sessions upsert warning:', error.message);
        else count += sessionsToUpsert.length;
      }
    }

    // 2. Sync Communities
    if (Array.isArray(dbData.communities) && dbData.communities.length > 0) {
      const commsToUpsert = dbData.communities.map((c: any) => ({
        id: c.id,
        slug: c.slug || c.id,
        name: c.name,
        tagline: c.description?.slice(0, 120) || null,
        description: c.description || null,
        avatar: c.avatar || null,
        cover_image: c.coverImage || null,
        owner_id: c.ownerId || null,
        contribution_categories: c.contributionCategories || [],
        discord_config: c.discordConfig || {},
        telegram_config: c.telegramConfig || {},
        connected_discord_servers: c.connectedDiscordServers || [],
        connected_telegram_groups: c.connectedTelegramGroups || [],
        created_at: c.createdAt || new Date().toISOString()
      }));
      const { error } = await client.from('communities').upsert(commsToUpsert, { onConflict: 'id' });
      if (error) console.warn('[Supabase Sync] Communities upsert warning:', error.message);
      else count += commsToUpsert.length;
    }

    // 3. Sync Memberships
    if (Array.isArray(dbData.memberships) && dbData.memberships.length > 0) {
      const memsToUpsert = dbData.memberships.map((m: any) => ({
        id: m.id,
        community_id: m.communityId,
        user_id: m.userId,
        role: m.role || 'member',
        joined_at: m.joinedAt || new Date().toISOString()
      }));
      const { error } = await client.from('memberships').upsert(memsToUpsert, { onConflict: 'id' });
      if (error) console.warn('[Supabase Sync] Memberships upsert warning:', error.message);
      else count += memsToUpsert.length;
    }

    // 4. Sync Requests
    if (Array.isArray(dbData.requests) && dbData.requests.length > 0) {
      const reqsToUpsert = dbData.requests.map((r: any) => ({
        id: r.id,
        community_id: r.communityId,
        creator_id: r.creatorId,
        title: r.title,
        description: r.description || null,
        category: r.category || null,
        skills_required: r.skillsRequired || [],
        priority: r.priority || 'medium',
        deadline: r.deadline || null,
        status: r.status || 'open',
        visibility: r.visibility || 'community',
        created_at: r.createdAt || new Date().toISOString()
      }));
      const { error } = await client.from('requests').upsert(reqsToUpsert, { onConflict: 'id' });
      if (error) console.warn('[Supabase Sync] Requests upsert warning:', error.message);
      else count += reqsToUpsert.length;
    }

    // 4b. Sync Offers (requires valid request_id and specialist_id foreign keys)
    if (Array.isArray(dbData.offers) && dbData.offers.length > 0) {
      const requestIds = new Set((dbData.requests || []).map((r: any) => r.id));
      const userIds = new Set((dbData.users || []).map((u: any) => u.id));
      const offersToUpsert = dbData.offers
        .filter((o: any) => requestIds.has(o.requestId) && userIds.has(o.memberId))
        .map((o: any) => ({
          id: o.id,
          request_id: o.requestId,
          specialist_id: o.memberId,
          proposal: o.proposedHelp || 'Helper offer submitted',
          skills_offered: Array.isArray(o.skills) ? o.skills : [],
          status: o.status || 'pending',
          created_at: o.createdAt || new Date().toISOString()
        }));
      if (offersToUpsert.length > 0) {
        const { error } = await client.from('offers').upsert(offersToUpsert, { onConflict: 'id' });
        if (error) console.warn('[Supabase Sync] Offers upsert warning:', error.message);
        else count += offersToUpsert.length;
      }
    }

    // 5. Sync Tasks
    if (Array.isArray(dbData.tasks) && dbData.tasks.length > 0) {
      const tasksToUpsert = dbData.tasks.map((t: any) => ({
        id: t.id,
        community_id: t.communityId,
        plan_id: t.planId || null,
        request_id: t.requestId || null,
        assignee_id: t.assigneeId || null,
        title: t.title,
        description: t.description || null,
        status: t.status || 'todo',
        deadline: t.deadline || null,
        deliverable_url: t.deliverableUrl || null,
        created_at: t.createdAt || new Date().toISOString()
      }));
      const { error } = await client.from('tasks').upsert(tasksToUpsert, { onConflict: 'id' });
      if (error) console.warn('[Supabase Sync] Tasks upsert warning:', error.message);
      else count += tasksToUpsert.length;
    }

    // 6. Sync Contributions (map memberId/submissionDate/evidence/reviewStatus cleanly)
    if (Array.isArray(dbData.contributions) && dbData.contributions.length > 0) {
      const contribsToUpsert = dbData.contributions.map((cnt: any) => {
        const primaryEvidenceUrl =
          cnt.evidenceUrl ||
          (Array.isArray(cnt.evidence) && cnt.evidence[0]?.url) ||
          'https://community-outcome.ghazghazibahaeddin.workers.dev';
        return {
          id: cnt.id,
          community_id: cnt.communityId,
          contributor_id: cnt.memberId || cnt.contributorId || 'usr_alex',
          task_id: cnt.relatedTaskId || cnt.taskId || null,
          title: cnt.title,
          description: cnt.description || null,
          evidence_url: primaryEvidenceUrl,
          status: cnt.reviewStatus || cnt.status || 'pending',
          peer_reviews: cnt.evidence || cnt.peerReviews || [],
          submitted_at: cnt.submissionDate || cnt.submittedAt || cnt.createdAt || new Date().toISOString()
        };
      });
      const { error } = await client.from('contributions').upsert(contribsToUpsert, { onConflict: 'id' });
      if (error) console.warn('[Supabase Sync] Contributions upsert warning:', error.message);
      else count += contribsToUpsert.length;
    }

    // 7. Sync Subscriptions
    if (Array.isArray(dbData.subscriptions) && dbData.subscriptions.length > 0) {
      const subsToUpsert = dbData.subscriptions.map((s: any) => ({
        id: s.id,
        community_id: s.communityId,
        tier: s.tier || 'free',
        status: s.status || 'active',
        provider: s.provider || 'whop',
        provider_customer_id: s.providerCustomerId || null,
        provider_subscription_id: s.providerSubscriptionId || null,
        provider_plan_id: s.providerPlanId || null,
        current_period_start: s.currentPeriodStart || new Date().toISOString(),
        current_period_end: s.currentPeriodEnd || new Date(Date.now() + 30 * 86400000).toISOString(),
        amount_usd: s.amountUsd || 0.0,
        currency: s.currency || 'USD',
        billing_interval: s.billingInterval || 'month',
        created_at: s.createdAt || new Date().toISOString(),
        updated_at: s.updatedAt || new Date().toISOString()
      }));
      const { error } = await client.from('subscriptions').upsert(subsToUpsert, { onConflict: 'id' });
      if (error) console.warn('[Supabase Sync] Subscriptions upsert warning:', error.message);
      else count += subsToUpsert.length;
    }

    // 8. Sync Referrals
    if (Array.isArray(dbData.referrals) && dbData.referrals.length > 0) {
      const refsToUpsert = dbData.referrals.map((r: any) => ({
        id: r.id,
        referral_code: r.referralCode,
        community_id: r.communityId,
        referrer_user_id: r.referrerUserId,
        target_type: r.targetType || 'community',
        target_id: r.targetId || null,
        clicks_count: r.clicksCount || 0,
        conversions_count: r.conversionsCount || 0,
        created_at: r.createdAt || new Date().toISOString(),
        last_clicked_at: r.lastClickedAt || null
      }));
      const { error } = await client.from('referrals').upsert(refsToUpsert, { onConflict: 'id' });
      if (error) console.warn('[Supabase Sync] Referrals upsert warning:', error.message);
      else count += refsToUpsert.length;
    }

    // 9. Sync Identity & Group Connection Challenges
    if (Array.isArray(dbData.identityChallenges) && dbData.identityChallenges.length > 0) {
      const userIds = new Set((dbData.users || []).map((u: any) => u.id));
      const idChallengesToUpsert = dbData.identityChallenges
        .filter((ch: any) => userIds.has(ch.userId))
        .map((ch: any) => ({
          id: ch.id,
          code: ch.code,
          user_id: ch.userId,
          platform: ch.platform,
          is_used: Boolean(ch.isUsed),
          created_at: ch.createdAt || new Date().toISOString(),
          expires_at: ch.expiresAt || new Date(Date.now() + 900000).toISOString()
        }));
      if (idChallengesToUpsert.length > 0) {
        const { error } = await client.from('identity_challenges').upsert(idChallengesToUpsert, { onConflict: 'id' });
        if (error) console.warn('[Supabase Sync] Identity challenges upsert warning:', error.message);
        else count += idChallengesToUpsert.length;
      }
    }

    if (Array.isArray(dbData.groupConnectionChallenges) && dbData.groupConnectionChallenges.length > 0) {
      const commIds = new Set((dbData.communities || []).map((c: any) => c.id));
      const grpChallengesToUpsert = dbData.groupConnectionChallenges
        .filter((ch: any) => commIds.has(ch.communityId))
        .map((ch: any) => ({
          id: ch.id,
          code: ch.code,
          community_id: ch.communityId,
          created_by: ch.createdBy || null,
          platform: ch.platform,
          is_used: Boolean(ch.isUsed),
          created_at: ch.createdAt || new Date().toISOString(),
          expires_at: ch.expiresAt || new Date(Date.now() + 900000).toISOString()
        }));
      if (grpChallengesToUpsert.length > 0) {
        const { error } = await client.from('group_connection_challenges').upsert(grpChallengesToUpsert, { onConflict: 'id' });
        if (error) console.warn('[Supabase Sync] Group connection challenges upsert warning:', error.message);
        else count += grpChallengesToUpsert.length;
      }
    }

    if (Array.isArray(dbData.auditLogs) && dbData.auditLogs.length > 0) {
      const auditToUpsert = dbData.auditLogs.slice(0, 200).map((a: any) => ({
        id: a.id,
        community_id: a.communityId || null,
        actor_id: a.actorId || null,
        action: a.action || 'event',
        details: a.details || null,
        timestamp: a.timestamp || new Date().toISOString()
      }));
      const { error } = await client.from('audit_logs').upsert(auditToUpsert, { onConflict: 'id' });
      if (error) console.warn('[Supabase Sync] Audit logs upsert warning:', error.message);
      else count += auditToUpsert.length;
    }

    return { success: true, syncedCount: count };
  } catch (err: any) {
    console.error('[Supabase Sync] Error during sync:', err.message);
    return { success: false, syncedCount: count, error: err.message };
  }
}

/**
 * Hydrate complete database state from Supabase PostgreSQL (Edge / Cloudflare Workers Native)
 */
export async function hydrateDatabaseFromSupabase(explicitEnv?: CloudflareEnv): Promise<any | null> {
  const client = getSupabaseClient(explicitEnv);
  if (!client) return null;

  try {
    const [
      usersRes,
      accountsRes,
      sessionsRes,
      commsRes,
      memsRes,
      reqsRes,
      offersRes,
      tasksRes,
      contribsRes,
      subsRes,
      refsRes,
      idChallengesRes,
      grpChallengesRes,
      auditLogsRes
    ] = await Promise.all([
      client.from('users').select('*'),
      client.from('auth_accounts').select('*'),
      client.from('auth_sessions').select('*'),
      client.from('communities').select('*'),
      client.from('memberships').select('*'),
      client.from('requests').select('*'),
      client.from('offers').select('*'),
      client.from('tasks').select('*'),
      client.from('contributions').select('*'),
      client.from('subscriptions').select('*'),
      client.from('referrals').select('*'),
      client.from('identity_challenges').select('*'),
      client.from('group_connection_challenges').select('*'),
      client.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(200)
    ]);

    if (usersRes.error || commsRes.error) {
      console.warn('[Supabase Hydrate Warning] Failed to query primary tables:', usersRes.error?.message || commsRes.error?.message);
      return null;
    }

    const users = (usersRes.data || []).map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      bio: u.bio,
      platformRole: u.platform_role || 'user',
      createdAt: u.created_at,
      identities: u.identities || {},
      passport: u.passport || {},
      privacy: u.privacy || {}
    }));

    const authAccounts = (accountsRes.data || []).map((a: any) => ({
      id: a.user_id || a.id,
      email: a.email,
      passwordHash: a.password_hash || '',
      salt: a.salt || '',
      emailVerified: true,
      resetToken: a.password_reset_token || undefined,
      resetTokenExpiry: a.password_reset_expires_at || undefined,
      createdAt: a.created_at,
      updatedAt: a.created_at
    }));

    const sessions = (sessionsRes.data || []).map((s: any) => ({
      token: s.token,
      userId: s.user_id,
      createdAt: s.created_at,
      expiresAt: s.expires_at
    }));

    const communities = (commsRes.data || []).map((c: any) => ({
      id: c.id,
      slug: c.slug || c.id,
      name: c.name,
      description: c.description || c.tagline || '',
      category: c.category || 'General',
      avatar: c.avatar,
      coverImage: c.cover_image,
      ownerId: c.owner_id,
      rules: c.rules || ['Be respectful and transparent', 'Deliver on verified commitments'],
      contributionCategories: c.contribution_categories || [],
      discordConfig: c.discord_config || { connected: false, status: 'not_configured' },
      telegramConfig: c.telegram_config || { connected: false, status: 'not_configured' },
      connectedDiscordServers: c.connected_discord_servers || [],
      connectedTelegramGroups: c.connected_telegram_groups || [],
      createdAt: c.created_at
    }));

    const memberships = (memsRes.data || []).map((m: any) => ({
      id: m.id,
      communityId: m.community_id,
      userId: m.user_id,
      role: m.role || 'member',
      joinedAt: m.joined_at,
      onboardingStatus: 'first_action_completed'
    }));

    const reqCommunityMap = new Map<string, string>();
    const requests = (reqsRes.data || []).map((r: any) => {
      reqCommunityMap.set(r.id, r.community_id);
      return {
        id: r.id,
        communityId: r.community_id,
        creatorId: r.creator_id,
        title: r.title,
        description: r.description || '',
        category: r.category || 'cat_core',
        skillsRequired: r.skills_required || [],
        priority: r.priority || 'medium',
        deadline: r.deadline,
        status: r.status || 'open',
        visibility: r.visibility || 'community',
        createdAt: r.created_at,
        updatedAt: r.created_at
      };
    });

    const offers = (offersRes.data || []).map((o: any) => ({
      id: o.id,
      requestId: o.request_id,
      communityId: reqCommunityMap.get(o.request_id) || 'comm_devforge',
      memberId: o.specialist_id,
      proposedHelp: o.proposal || '',
      skills: Array.isArray(o.skills_offered) ? o.skills_offered : [],
      experienceDescription: 'Synced from Community OS repository',
      availability: 'Available',
      estimatedHours: 4,
      status: o.status || 'pending',
      createdAt: o.created_at
    }));

    const tasks = (tasksRes.data || []).map((t: any) => ({
      id: t.id,
      communityId: t.community_id,
      planId: t.plan_id,
      requestId: t.request_id,
      assigneeId: t.assignee_id,
      title: t.title,
      description: t.description || '',
      expectedOutput: t.description || '',
      acceptanceCriteria: 'Verified evidence submitted',
      status: t.status || 'todo',
      deadline: t.deadline,
      checklist: [],
      evidenceIds: [],
      createdAt: t.created_at
    }));

    const contributions = (contribsRes.data || []).map((cnt: any) => ({
      id: cnt.id,
      communityId: cnt.community_id,
      memberId: cnt.contributor_id,
      categoryId: 'cat_core',
      relatedTaskId: cnt.task_id,
      title: cnt.title,
      description: cnt.description || '',
      evidence: Array.isArray(cnt.peer_reviews) && cnt.peer_reviews.length > 0
        ? cnt.peer_reviews
        : [{ id: `ev_${cnt.id}`, type: 'link', url: cnt.evidence_url, description: cnt.description || 'Evidence', submittedAt: cnt.submitted_at }],
      reviewStatus: cnt.status || 'pending',
      firstPartyConfirmed: true,
      secondPartyConfirmed: cnt.status === 'verified',
      sharingValidity: true,
      submissionDate: cnt.submitted_at,
      createdAt: cnt.submitted_at
    }));

    const subscriptions = (subsRes.data || []).map((s: any) => ({
      id: s.id,
      communityId: s.community_id,
      tier: s.tier || 'free',
      status: s.status || 'active',
      provider: s.provider || 'whop',
      providerCustomerId: s.provider_customer_id,
      providerSubscriptionId: s.provider_subscription_id,
      providerPlanId: s.provider_plan_id,
      currentPeriodStart: s.current_period_start,
      currentPeriodEnd: s.current_period_end,
      cancelAtPeriodEnd: false,
      amountUsd: Number(s.amount_usd || 0),
      currency: s.currency || 'USD',
      billingInterval: s.billing_interval || 'month',
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));

    const referrals = (refsRes.data || []).map((r: any) => ({
      id: r.id,
      referralCode: r.referral_code,
      communityId: r.community_id,
      referrerUserId: r.referrer_user_id,
      targetType: r.target_type || 'community',
      targetId: r.target_id,
      clicksCount: r.clicks_count || 0,
      conversionsCount: r.conversions_count || 0,
      createdAt: r.created_at,
      lastClickedAt: r.last_clicked_at
    }));

    const identityChallenges = (idChallengesRes.data || []).map((ch: any) => ({
      id: ch.id,
      code: ch.code,
      userId: ch.user_id,
      platform: ch.platform,
      isUsed: Boolean(ch.is_used),
      createdAt: ch.created_at,
      expiresAt: ch.expires_at
    }));

    const groupConnectionChallenges = (grpChallengesRes.data || []).map((ch: any) => ({
      id: ch.id,
      code: ch.code,
      communityId: ch.community_id,
      createdBy: ch.created_by || 'usr_sarah',
      platform: ch.platform,
      isUsed: Boolean(ch.is_used),
      createdAt: ch.created_at,
      expiresAt: ch.expires_at
    }));

    const auditLogs = (auditLogsRes.data || []).map((a: any) => ({
      id: a.id,
      communityId: a.community_id || 'comm_devforge',
      actorId: a.actor_id || 'system',
      action: a.action,
      details: a.details || '',
      timestamp: a.timestamp
    }));

    return {
      users,
      authAccounts,
      sessions,
      communities,
      memberships,
      requests,
      offers,
      tasks,
      contributions,
      subscriptions,
      referrals,
      identityChallenges,
      groupConnectionChallenges,
      auditLogs
    };
  } catch (err: any) {
    console.error('[Supabase Hydrate Exception]:', err.message);
    return null;
  }
}
