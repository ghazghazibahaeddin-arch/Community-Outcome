// Community OS — Type Definitions

export type Language = 'en' | 'ar';

export type UserRole = 
  | 'platform_admin'
  | 'community_owner'
  | 'admin'
  | 'moderator'
  | 'reviewer'
  | 'event_organizer'
  | 'task_manager'
  | 'expert'
  | 'member'
  | 'guest';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
  platformRole: 'platform_admin' | 'user';
  createdAt: string;
  identities: {
    discordId?: string;
    discordUsername?: string;
    telegramId?: string;
    telegramUsername?: string;
    linkedAt?: string;
  };
  passport: MemberPassport;
  privacy: PrivacySettings;
}

export interface AuthAccount {
  id: string; // matches User.id
  email: string;
  passwordHash: string;
  salt: string;
  emailVerified: boolean;
  resetToken?: string;
  resetTokenExpiry?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  userAgent?: string;
  ip?: string;
}

export interface DevEmail {
  id: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  resetUrl?: string;
  resetToken?: string;
  sentAt: string;
}

export interface PrivacySettings {
  showBio: boolean;
  showSkills: boolean;
  showVerifiedOnly: boolean;
  allowDiscovery: boolean;
  allowCrossCommunitySharing: boolean;
  shareableRecordIds: string[];
}

export interface MemberPassport {
  displayName: string;
  biography: string;
  skills: { name: string; verified: boolean; verifiedByCommunityId?: string }[];
  interests: string[];
  languages: string[];
  collaborationPreferences: string;
  portfolioLinks: string[];
  isPublic: boolean;
}

export interface Community {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  avatar: string;
  coverImage: string;
  ownerId: string;
  createdAt: string;
  rules: string[];
  discordConfig: {
    connected: boolean;
    serverId?: string;
    serverName?: string;
    channelId?: string;
    channelName?: string;
    status: 'not_configured' | 'unverified' | 'connected' | 'error' | 'not_connected' | 'setup_required' | 'bot_not_installed' | 'verification_pending' | 'connected_and_verified' | 'connected_with_restricted_permissions' | 'disconnected';
    botPresence?: boolean;
    permissions?: string[];
    missingPermissions?: string[];
    slashCommandsRegistered?: number;
    menuMessageId?: string;
    lastChecked?: string;
    lastError?: string;
  };
  telegramConfig: {
    connected: boolean;
    groupId?: string;
    groupTitle?: string;
    channelId?: string;
    status: 'not_configured' | 'unverified' | 'connected' | 'error' | 'not_connected' | 'setup_required' | 'bot_not_installed' | 'verification_pending' | 'connected_and_verified' | 'connected_with_restricted_permissions' | 'disconnected';
    botMembership?: boolean;
    botIsAdmin?: boolean;
    webhookActive?: boolean;
    menuMessageId?: string;
    lastChecked?: string;
    lastError?: string;
  };
  connectedDiscordServers?: {
    serverId: string;
    serverName: string;
    channelId?: string;
    status: string;
    connectedAt: string;
  }[];
  connectedTelegramGroups?: {
    groupId: string;
    groupTitle: string;
    status: string;
    connectedAt: string;
  }[];
  contributionCategories: {
    id: string;
    name: string;
    nameAr: string;
    description: string;
    requiresReview: boolean;
  }[];
}

export interface CommunityMembership {
  id: string;
  userId: string;
  communityId: string;
  role: UserRole;
  joinedAt: string;
  firstMeaningfulActionAt?: string;
  onboardingStatus: 'started' | 'interests_selected' | 'first_action_completed';
}

export type RequestStatus =
  | 'draft'
  | 'open'
  | 'receiving_offers'
  | 'matched'
  | 'in_progress'
  | 'completed'
  | 'closed'
  | 'disputed';

export interface NeedSignalRequest {
  id: string;
  communityId: string;
  creatorId: string;
  title: string;
  description: string;
  category: string;
  skillsRequired: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline: string;
  status: RequestStatus;
  visibility: 'community' | 'cross_community' | 'public';
  allowedCommunityIds?: string[];
  assignedOfferId?: string;
  assignedMemberId?: string;
  createdAt: string;
  updatedAt: string;
  statusNotes?: string;
}

export interface Offer {
  id: string;
  requestId: string;
  communityId: string;
  memberId: string;
  proposedHelp: string;
  skills: string[];
  experienceDescription: string;
  availability: string;
  estimatedHours: number;
  portfolioLinks: string[];
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface ExpertProfile {
  id: string;
  communityId: string;
  memberId: string;
  declaredSkills: string[];
  verifiedSpecialties: string[];
  experienceBio: string;
  availableHoursPerWeek: number;
  assistanceCategories: string[];
  availableSlots: string[];
  totalConsultations: number;
}

export interface Appointment {
  id: string;
  communityId: string;
  expertProfileId: string;
  memberId: string;
  requestedSlot: string;
  topic: string;
  status: 'requested' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface Poll {
  id: string;
  communityId: string;
  creatorId: string;
  question: string;
  questionAr?: string;
  alternatives: { id: string; text: string; votes: string[] }[];
  status: 'open' | 'closed';
  winningAlternativeId?: string;
  createdAt: string;
  executionPlanId?: string;
}

export interface ExecutionPlan {
  id: string;
  communityId: string;
  sourcePollId: string;
  title: string;
  agreedOutcome: string;
  leadOwnerId: string;
  deadline: string;
  tasks: PlanTask[];
  status: 'draft' | 'in_progress' | 'verified_complete';
  createdAt: string;
}

export interface PlanTask {
  id: string;
  planId?: string;
  communityId: string;
  title: string;
  description: string;
  expectedOutput: string;
  outputExpected?: string;
  acceptanceCriteria: string;
  assigneeId?: string;
  deadline: string;
  status: 'todo' | 'in_progress' | 'under_review' | 'completed';
  checklist: { id: string; item: string; completed: boolean }[];
  evidenceIds: string[];
  rewardRecognition?: string;
  createdAt: string;
}

export interface Commitment {
  id: string;
  communityId: string;
  agreedWhat: string;
  committedById: string;
  expectingDeliveryId: string;
  relatedRequestId?: string;
  deadline: string;
  status: 'active' | 'fulfilled' | 'disputed' | 'rescheduled';
  history: { timestamp: string; note: string; authorId: string }[];
  createdAt: string;
}

export interface TaskHandoff {
  id: string;
  communityId: string;
  taskId: string;
  previousOwnerId: string;
  nextOwnerId: string;
  contextNotes: string;
  transferredEvidence: string[];
  accepted: boolean;
  transferredAt: string;
}

export interface Intent {
  id: string;
  communityId: string;
  memberId: string;
  intentType: 'volunteer' | 'attend_event' | 'help_request' | 'join_challenge';
  targetTitle: string;
  targetId: string;
  status: 'declared' | 'converted' | 'withdrawn';
  createdAt: string;
}

export interface Contribution {
  id: string;
  communityId: string;
  memberId: string;
  categoryId: string;
  title: string;
  description: string;
  relatedTaskId?: string;
  relatedRequestId?: string;
  evidence: {
    id: string;
    type: 'link' | 'file' | 'note';
    url: string;
    description: string;
    submittedAt: string;
  }[];
  submissionDate: string;
  createdAt?: string;
  reviewStatus: 'pending' | 'verified' | 'rejected' | 'disputed';
  reviewerId?: string;
  decisionReason?: string;
  firstPartyConfirmed: boolean;
  secondPartyConfirmed: boolean;
  secondPartyId?: string;
  sharingValidity: boolean;
}

export interface MutualAttestation {
  id: string;
  communityId: string;
  relatedObjective: string;
  partyOneId: string;
  partyOneConfirmed: boolean;
  partyOneStatement: string;
  partyTwoId: string;
  partyTwoConfirmed: boolean;
  partyTwoStatement: string;
  evidenceLinks: string[];
  status: 'agreed' | 'disputed' | 'pending';
  resolutionNotes?: string;
  createdAt: string;
}

export interface Dispute {
  id: string;
  communityId: string;
  contributionId: string;
  filedById: string;
  reason: string;
  evidenceLinks: string[];
  assignedReviewerId?: string;
  status: 'open' | 'investigating' | 'resolved' | 'appealed';
  resolutionNotes?: string;
  auditTrail: { timestamp: string; action: string; actorId: string }[];
  createdAt: string;
}

export interface OutcomeRecord {
  id: string;
  communityId: string;
  objective: string;
  participatingMemberIds: string[];
  deliveredResult: string;
  confirmationStatus: 'verified' | 'pending' | 'disputed';
  evidenceUrls: string[];
  date: string;
  shareable: boolean;
}

export interface OutcomePortfolioItem {
  id: string;
  userId: string;
  outcomeRecordId: string;
  title: string;
  roleDescription: string;
  communityName: string;
  featured: boolean;
  isPublic: boolean;
}

export interface KnowledgeArticle {
  id: string;
  communityId: string;
  title: string;
  titleAr?: string;
  content: string;
  category: string;
  authorId: string;
  createdAt: string;
  lastReviewedDate: string;
  reviewDueIntervalDays: number;
  version: number;
  status: 'current' | 'needs_review' | 'superseded';
  sources: { title: string; url: string; context: string }[];
  supersededById?: string;
}

export interface TrustedSourceCard {
  id: string;
  communityId: string;
  factualClaim: string;
  primarySource: string;
  sourceContext: string;
  reviewerId: string;
  reviewedDate: string;
  uncertaintyNotes?: string;
  isCurrent: boolean;
}

export type LinkType =
  | 'link_1_ranking'
  | 'link_3_thanks'
  | 'link_4_confirmable'
  | 'link_5_portable_card'
  | 'link_6_owner_dashboard'
  | 'link_7_bounties'
  | 'link_8_approval_rules'
  | 'link_9_help_request'
  | 'link_10_service_offer'
  | 'link_11_booking'
  | 'link_12_rsvp'
  | 'link_13_checklist'
  | 'link_14_evidence'
  | 'link_15_decision'
  | 'link_16_knowledge_source'
  | 'link_17_onboarding'
  | 'link_18_task_card'
  | 'link_19_status_update'
  | 'link_20_multi_community'
  | 'link_21_attendance'
  | 'link_22_single_contribution'
  | 'link_23_referral'
  | 'link_24_issue_report'
  | 'link_25_audience_expiry'
  | 'link_26_outcome_report'
  | 'hub_multipurpose';

export interface CommunityLink {
  id: string;
  communityId: string;
  linkType: LinkType;
  slug: string;
  title: string;
  description: string;
  targetEntityId?: string;
  audience: 'public' | 'members_only' | 'role_restricted';
  requiredRole?: UserRole;
  expiresAt?: string;
  isRevoked: boolean;
  referralCode?: string;
  stats: {
    visits: number;
    starts: number;
    submissions: number;
    completions: number;
    verifiedOutcomes: number;
  };
  createdAt: string;
}

export interface CommunityEvent {
  id: string;
  communityId: string;
  title: string;
  description: string;
  date: string;
  location: string;
  rsvps: { userId: string; timestamp: string }[];
  confirmedAttendees: { userId: string; confirmedAt: string; evidenceNote?: string }[];
}

export interface AgentKitWorkflow {
  id: string;
  communityId: string;
  name: string;
  nameAr?: string;
  trigger: 'new_member' | 'new_request' | 'evidence_submitted' | 'task_overdue' | 'inactivity_detected';
  conditions: string;
  allowedActions: string[];
  requiresHumanApproval: boolean;
  status: 'active' | 'paused';
  executionCount: number;
  lastExecutedAt?: string;
  actionLog: { timestamp: string; action: string; outcome: string }[];
}

export interface MiniAppTestRun {
  id: string;
  appName: string;
  appVersion: string;
  testedAt: string;
  testerId: string;
  testEnvironment: 'telegram_web' | 'telegram_mobile_ios' | 'telegram_mobile_android';
  checks: {
    name: string;
    passed: boolean;
    evidence: string;
  }[];
  knownLimitations: string[];
  status: 'passed' | 'warning' | 'failed';
}

export interface DiscordCommandTest {
  id: string;
  commandName: string;
  testedRole: UserRole;
  simulationInput: string;
  expectedResult: string;
  actualResult: string;
  passed: boolean;
  executedAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  communityId: string;
  title: string;
  message: string;
  linkUrl: string;
  type: 'request' | 'offer' | 'task' | 'review' | 'dispute' | 'event' | 'knowledge';
  read: boolean;
  channelAttempts: {
    inApp: boolean;
    discord: boolean;
    telegram: boolean;
  };
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  communityId: string;
  actorId: string;
  action: string;
  details: string;
  timestamp: string;
}

export type DataMode = 'demo' | 'production';

export interface IdentityChallenge {
  id: string;
  code: string;
  userId: string;
  platform: 'discord' | 'telegram';
  createdAt: string;
  expiresAt: string;
  isUsed: boolean;
}

export interface GroupConnectionChallenge {
  id: string;
  code: string;
  communityId: string;
  createdBy: string;
  platform: 'discord' | 'telegram';
  createdAt: string;
  expiresAt: string;
  isUsed: boolean;
}

export interface OwnerActionItem {
  id: string;
  priority: 'urgent' | 'high' | 'medium';
  title: string;
  description: string;
  category: 'request' | 'offer' | 'review' | 'dispute' | 'task' | 'knowledge' | 'integration';
  actionType: string;
  targetId: string;
  createdAt: string;
}

export interface IntegrationCheckResult {
  platform: 'discord' | 'telegram';
  configured: boolean;
  status: 'not_configured' | 'unverified' | 'connected' | 'error';
  botUsername?: string;
  botId?: string;
  botName?: string;
  details: string;
  inviteUrl?: string;
  webhookUrl?: string;
  checkedAt: string;
}
