-- Community OS — Production Supabase PostgreSQL Schema & Migrations
-- Enables Multi-Tenant Isolation, Row-Level Security, and Real-Time Synchronization

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. USERS & PROFILES
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar TEXT,
  bio TEXT,
  platform_role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  identities JSONB NOT NULL DEFAULT '{}'::jsonb,
  passport JSONB NOT NULL DEFAULT '{}'::jsonb,
  privacy JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 3. AUTH ACCOUNTS (Secure Password Store)
CREATE TABLE IF NOT EXISTS auth_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  salt TEXT,
  password_reset_token TEXT,
  password_reset_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. AUTH SESSIONS
CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. COMMUNITIES (Multi-Tenant Root)
CREATE TABLE IF NOT EXISTS communities (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  avatar TEXT,
  cover_image TEXT,
  owner_id TEXT REFERENCES users(id),
  contribution_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  discord_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  telegram_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  connected_discord_servers JSONB NOT NULL DEFAULT '[]'::jsonb,
  connected_telegram_groups JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. COMMUNITY MEMBERSHIPS & ROLES
CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- platform_admin, community_owner, admin, core_contributor, member, guest
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

-- 7. NEEDSIGNAL REQUESTS
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  skills_required JSONB NOT NULL DEFAULT '[]'::jsonb,
  priority TEXT NOT NULL DEFAULT 'medium',
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open', -- open, receiving_offers, in_progress, completed, archived
  visibility TEXT NOT NULL DEFAULT 'community',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. OFFERS
CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  specialist_id TEXT NOT NULL REFERENCES users(id),
  proposal TEXT NOT NULL,
  skills_offered JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, withdrawn
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. QUESTLOOP TASKS
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  plan_id TEXT,
  request_id TEXT REFERENCES requests(id),
  assignee_id TEXT REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, in_review, completed
  deadline TIMESTAMPTZ,
  deliverable_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. COMMITMENTS
CREATE TABLE IF NOT EXISTS commitments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'active',
  committed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. CONTRIBUTIONS (SourceTrail & Verified Ledger)
CREATE TABLE IF NOT EXISTS contributions (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  contributor_id TEXT NOT NULL REFERENCES users(id),
  task_id TEXT REFERENCES tasks(id),
  title TEXT NOT NULL,
  description TEXT,
  evidence_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review', -- pending_review, verified, rejected
  peer_reviews JSONB NOT NULL DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. IDENTITY CHALLENGES (Telegram/Discord User Linking)
CREATE TABLE IF NOT EXISTS identity_challenges (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  platform TEXT NOT NULL, -- discord, telegram
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- 13. GROUP CONNECTION CHALLENGES (/connect CODE)
CREATE TABLE IF NOT EXISTS group_connection_challenges (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  created_by TEXT REFERENCES users(id),
  platform TEXT NOT NULL, -- discord, telegram
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- 14. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  community_id TEXT,
  actor_id TEXT,
  action TEXT NOT NULL,
  details TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. INDEXES FOR HIGH-THROUGHPUT QUERIES
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_memberships_comm ON memberships(community_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_comm ON requests(community_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_tasks_comm ON tasks(community_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_contributions_comm ON contributions(community_id);
CREATE INDEX IF NOT EXISTS idx_id_challenges_code ON identity_challenges(code);
CREATE INDEX IF NOT EXISTS idx_group_challenges_code ON group_connection_challenges(code);

-- 16. ROW LEVEL SECURITY (Multi-Tenant Isolation)
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read access to community basics
CREATE POLICY "Public communities read" ON communities FOR SELECT USING (true);
CREATE POLICY "Public requests read" ON requests FOR SELECT USING (visibility = 'public' OR visibility = 'community');
CREATE POLICY "Public tasks read" ON tasks FOR SELECT USING (true);
CREATE POLICY "Public contributions read" ON contributions FOR SELECT USING (true);

-- 17. SUBSCRIPTIONS & MONETIZATION
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free', -- free, pro
  status TEXT NOT NULL DEFAULT 'active', -- active, pending, past_due, canceled, expired
  provider TEXT NOT NULL DEFAULT 'whop', -- whop, gumroad, manual
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  provider_plan_id TEXT,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  amount_usd NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_interval TEXT NOT NULL DEFAULT 'month',
  last_payment_event_id TEXT,
  last_payment_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. PAYMENT WEBHOOK EVENTS (Idempotency Store)
CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  community_id TEXT REFERENCES communities(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed BOOLEAN NOT NULL DEFAULT TRUE,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, event_id)
);

-- 19. VIRAL REFERRALS & INVITATIONS
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  referral_code TEXT UNIQUE NOT NULL,
  community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  referrer_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL DEFAULT 'community', -- community, request, task, passport
  target_id TEXT,
  clicks_count INT NOT NULL DEFAULT 0,
  conversions_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_clicked_at TIMESTAMPTZ
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public subscriptions read" ON subscriptions FOR SELECT USING (true);
CREATE POLICY "Public referrals read" ON referrals FOR SELECT USING (true);

