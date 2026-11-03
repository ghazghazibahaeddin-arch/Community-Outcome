// Community OS — Supabase PostgreSQL Client & Multi-Tenant Adapter
// Server-side only: never expose service role key to browser

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  return Boolean(url && url.trim().length > 0 && key && key.trim().length > 0 && !url.includes('your-project'));
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const url = process.env.SUPABASE_URL?.trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)?.trim();

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

    return { success: true, syncedCount: count };
  } catch (err: any) {
    console.error('[Supabase Sync] Error during sync:', err.message);
    return { success: false, syncedCount: count, error: err.message };
  }
}
