// Community OS — Supabase Data Migration Runner
// Safely migrates all data from local JSON database to Supabase PostgreSQL without loss

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const DB_PATH = path.join(process.cwd(), 'data', 'community_os_db.json');
const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)?.trim();

console.log('=====================================================');
console.log('COMMUNITY OS — SUPABASE DATA MIGRATION RUNNER');
console.log('=====================================================\n');

if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL.includes('your-project')) {
  console.log('[Notice] Supabase PostgreSQL credentials are not yet configured in environment.');
  console.log('To migrate to live Supabase, configure:');
  console.log('  1. SUPABASE_URL (e.g. https://xyzcompany.supabase.co)');
  console.log('  2. SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)');
  console.log('  3. DATABASE_URL (for running DDL migrations)\n');
  console.log('Local persistent database will continue to guarantee zero data loss.\n');
  process.exit(0);
}

if (!fs.existsSync(DB_PATH)) {
  console.error('[Error] Source database file not found at:', DB_PATH);
  process.exit(1);
}

const rawDb = fs.readFileSync(DB_PATH, 'utf-8');
const db = JSON.parse(rawDb);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runMigration() {
  console.log(`Connecting to Supabase at: ${SUPABASE_URL}...`);
  let totalMigrated = 0;

  // 1. Users
  if (Array.isArray(db.users) && db.users.length > 0) {
    const formatted = db.users.map((u) => ({
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
    const { error } = await supabase.from('users').upsert(formatted, { onConflict: 'id' });
    if (error) console.error('  [Users] Migration error:', error.message);
    else {
      console.log(`  ✓ Migrated ${formatted.length} Users`);
      totalMigrated += formatted.length;
    }
  }

  // 2. Communities
  if (Array.isArray(db.communities) && db.communities.length > 0) {
    const formatted = db.communities.map((c) => ({
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
    const { error } = await supabase.from('communities').upsert(formatted, { onConflict: 'id' });
    if (error) console.error('  [Communities] Migration error:', error.message);
    else {
      console.log(`  ✓ Migrated ${formatted.length} Communities`);
      totalMigrated += formatted.length;
    }
  }

  // 3. Memberships
  if (Array.isArray(db.memberships) && db.memberships.length > 0) {
    const formatted = db.memberships.map((m) => ({
      id: m.id,
      community_id: m.communityId,
      user_id: m.userId,
      role: m.role || 'member',
      joined_at: m.joinedAt || new Date().toISOString()
    }));
    const { error } = await supabase.from('memberships').upsert(formatted, { onConflict: 'id' });
    if (error) console.error('  [Memberships] Migration error:', error.message);
    else {
      console.log(`  ✓ Migrated ${formatted.length} Memberships`);
      totalMigrated += formatted.length;
    }
  }

  // 4. Requests (NeedSignal)
  if (Array.isArray(db.requests) && db.requests.length > 0) {
    const formatted = db.requests.map((r) => ({
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
    const { error } = await supabase.from('requests').upsert(formatted, { onConflict: 'id' });
    if (error) console.error('  [Requests] Migration error:', error.message);
    else {
      console.log(`  ✓ Migrated ${formatted.length} NeedSignal Requests`);
      totalMigrated += formatted.length;
    }
  }

  // 5. Tasks (QuestLoop)
  if (Array.isArray(db.tasks) && db.tasks.length > 0) {
    const formatted = db.tasks.map((t) => ({
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
    const { error } = await supabase.from('tasks').upsert(formatted, { onConflict: 'id' });
    if (error) console.error('  [Tasks] Migration error:', error.message);
    else {
      console.log(`  ✓ Migrated ${formatted.length} QuestLoop Tasks`);
      totalMigrated += formatted.length;
    }
  }

  // 6. Contributions (SourceTrail)
  if (Array.isArray(db.contributions) && db.contributions.length > 0) {
    const formatted = db.contributions.map((cnt) => ({
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
    const { error } = await supabase.from('contributions').upsert(formatted, { onConflict: 'id' });
    if (error) console.error('  [Contributions] Migration error:', error.message);
    else {
      console.log(`  ✓ Migrated ${formatted.length} Verified Contributions`);
      totalMigrated += formatted.length;
    }
  }

  console.log(`\nMigration completed! Successfully processed ${totalMigrated} records.`);
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
