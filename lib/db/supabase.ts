// Community OS — Supabase PostgreSQL Client & Multi-Tenant Adapter
// Server-side only: never expose service role key to browser

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;
  return Boolean(url && url.trim().length > 0 && key && key.trim().length > 0 && !url.includes('your-project'));
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const url = process.env.SUPABASE_URL?.trim();
  const key = (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY
  )?.trim();

  if (!url || !key || url.includes('your-project')) {
    return null;
  }

  try {
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    return supabaseInstance;
  } catch (err) {
    console.error('[Supabase Init Error]:', err);
    return null;
  }
}

/**
 * Sync in-memory/JSON store with Supabase PostgreSQL
 */
export async function syncDatabaseToSupabase(dbData: any): Promise<{ success: boolean; syncedCount: number; error?: string }> {
  const client = getSupabaseClient();
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

    // 2. Sync Communities
    if (Array.isArray(dbData.communities) && dbData.communities.length > 0) {
      const commsToUpsert = dbData.communities.map((c: any) => ({
        id: c.id,
        slug: c.slug || c.id,
        name: c.name,
        tagline: c.tagline || null,
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
        status: t.status || 'pending',
        deadline: t.deadline || null,
        deliverable_url: t.deliverableUrl || null,
        created_at: t.createdAt || new Date().toISOString()
      }));
      const { error } = await client.from('tasks').upsert(tasksToUpsert, { onConflict: 'id' });
      if (error) console.warn('[Supabase Sync] Tasks upsert warning:', error.message);
      else count += tasksToUpsert.length;
    }

    // 6. Sync Contributions
    if (Array.isArray(dbData.contributions) && dbData.contributions.length > 0) {
      const contribsToUpsert = dbData.contributions.map((cnt: any) => ({
        id: cnt.id,
        community_id: cnt.communityId,
        contributor_id: cnt.contributorId,
        task_id: cnt.taskId || null,
        title: cnt.title,
        description: cnt.description || null,
        evidence_url: cnt.evidenceUrl,
        status: cnt.status || 'pending_review',
        peer_reviews: cnt.peerReviews || [],
        submitted_at: cnt.submittedAt || new Date().toISOString()
      }));
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

    return { success: true, syncedCount: count };
  } catch (err: any) {
    console.error('[Supabase Sync] Error during sync:', err.message);
    return { success: false, syncedCount: count, error: err.message };
  }
}

/**
 * Hydrate complete database state from Supabase PostgreSQL (Edge / Cloudflare Workers Native)
 */
export async function hydrateDatabaseFromSupabase(): Promise<any | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const [
      usersRes,
      commsRes,
      memsRes,
      reqsRes,
      tasksRes,
      contribsRes,
      subsRes,
      refsRes
    ] = await Promise.all([
      client.from('users').select('*'),
      client.from('communities').select('*'),
      client.from('memberships').select('*'),
      client.from('requests').select('*'),
      client.from('tasks').select('*'),
      client.from('contributions').select('*'),
      client.from('subscriptions').select('*'),
      client.from('referrals').select('*')
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

    const communities = (commsRes.data || []).map((c: any) => ({
      id: c.id,
      slug: c.slug || c.id,
      name: c.name,
      tagline: c.tagline,
      description: c.description,
      avatar: c.avatar,
      coverImage: c.cover_image,
      ownerId: c.owner_id,
      contributionCategories: c.contribution_categories || [],
      discordConfig: c.discord_config || {},
      telegramConfig: c.telegram_config || {},
      connectedDiscordServers: c.connected_discord_servers || [],
      connectedTelegramGroups: c.connected_telegram_groups || [],
      createdAt: c.created_at
    }));

    const memberships = (memsRes.data || []).map((m: any) => ({
      id: m.id,
      communityId: m.community_id,
      userId: m.user_id,
      role: m.role || 'member',
      joinedAt: m.joined_at
    }));

    const requests = (reqsRes.data || []).map((r: any) => ({
      id: r.id,
      communityId: r.community_id,
      creatorId: r.creator_id,
      title: r.title,
      description: r.description,
      category: r.category,
      skillsRequired: r.skills_required || [],
      priority: r.priority || 'medium',
      deadline: r.deadline,
      status: r.status || 'open',
      visibility: r.visibility || 'community',
      createdAt: r.created_at
    }));

    const tasks = (tasksRes.data || []).map((t: any) => ({
      id: t.id,
      communityId: t.community_id,
      planId: t.plan_id,
      requestId: t.request_id,
      assigneeId: t.assignee_id,
      title: t.title,
      description: t.description,
      status: t.status || 'pending',
      deadline: t.deadline,
      deliverableUrl: t.deliverable_url,
      createdAt: t.created_at
    }));

    const contributions = (contribsRes.data || []).map((cnt: any) => ({
      id: cnt.id,
      communityId: cnt.community_id,
      contributorId: cnt.contributor_id,
      taskId: cnt.task_id,
      title: cnt.title,
      description: cnt.description,
      evidenceUrl: cnt.evidence_url,
      status: cnt.status || 'pending_review',
      peerReviews: cnt.peer_reviews || [],
      submittedAt: cnt.submitted_at
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

    return {
      users,
      communities,
      memberships,
      requests,
      tasks,
      contributions,
      subscriptions,
      referrals
    };
  } catch (err: any) {
    console.error('[Supabase Hydrate Exception]:', err.message);
    return null;
  }
}
