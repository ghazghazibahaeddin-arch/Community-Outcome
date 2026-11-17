// Community OS — Central Data & Actions API Route with Server-Side Authorization
import { NextRequest, NextResponse } from 'next/server';
import { dbOperations, ensureDatabaseHydrated, getDatabase, saveDatabase } from '@/lib/db/store';
import { computeCommunityAnalytics } from '@/lib/services/analytics';
import { runAllJourneyVerifications } from '@/lib/services/testingSuite';
import { getAuthenticatedUserFromRequest, getUserRoleInCommunity } from '@/lib/services/auth';
import {
  getCommunitySubscription,
  getCommunityEntitlements,
  verifyCommunityEntitlement,
  trackReferralEvent,
  WHOP_PRO_CHECKOUT_URL
} from '@/lib/services/subscriptionService';

import { getRuntimeEnv } from '@/lib/env';

export async function GET(req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  try {
    const url = new URL(req.url);
    const communityId = url.searchParams.get('communityId') || 'comm_devforge';

    await ensureDatabaseHydrated(env);
    const authUser = await getAuthenticatedUserFromRequest(req);
    const db = getDatabase();
    const analytics = computeCommunityAnalytics(communityId);
    const communities = dbOperations.getCommunities();
    const currentCommunity = dbOperations.getCommunityById(communityId) || communities[0];
    const requests = dbOperations.getRequests(communityId);
    const offers = dbOperations.getOffers(undefined, communityId);
    const tasks = dbOperations.getTasks(communityId);
    const contributions = dbOperations.getContributions(communityId);
    const expertProfiles = dbOperations.getExpertProfiles(communityId);
    const polls = dbOperations.getPolls(communityId);
    const links = dbOperations.getLinks(communityId);
    const knowledge = dbOperations.getKnowledge(communityId);
    const disputes = dbOperations.getDisputes(communityId);
    const agentKits = dbOperations.getAgentKits(communityId);
    const users = dbOperations.getUsers();
    const auditLogs = dbOperations.getAuditLogs(communityId);
    const recoveryCandidates = dbOperations.getMemberRecoveryCandidates(communityId);
    const discordTests = dbOperations.getDiscordTests();
    const miniAppTests = dbOperations.getMiniAppTests();

    // Compute user's role in the current community
    const currentUserRole = authUser ? getUserRoleInCommunity(authUser.id, communityId) : 'guest';

    return NextResponse.json({
      success: true,
      data: {
        authUser,
        currentUserRole,
        communities,
        memberships: db.memberships || [],
        currentCommunity,
        requests,
        offers,
        tasks,
        contributions,
        expertProfiles,
        polls,
        links,
        knowledge,
        disputes,
        agentKits,
        users,
        auditLogs,
        analytics,
        recoveryCandidates,
        discordTests,
        miniAppTests,
        commitments: db.commitments.filter(c => communityId === 'all' || c.communityId === communityId),
        handoffs: db.handoffs.filter(h => communityId === 'all' || h.communityId === communityId),
        intents: db.intents.filter(i => communityId === 'all' || i.communityId === communityId),
        attestations: db.attestations.filter(a => communityId === 'all' || a.communityId === communityId),
        outcomes: db.outcomes.filter(o => communityId === 'all' || o.communityId === communityId),
        portfolioItems: db.portfolioItems,
        events: db.events.filter(e => communityId === 'all' || e.communityId === communityId),
        announcements: dbOperations.getAnnouncements(communityId),
        inviteCodes: dbOperations.getInviteCodes(communityId),
        moderationActions: (db.moderationActions || []).filter(m => communityId === 'all' || m.communityId === communityId),
        notifications: authUser ? dbOperations.getNotifications(authUser.id) : (db.notifications || []),
        ownerActionItems: dbOperations.getOwnerActionItems(communityId),
        dataMode: dbOperations.getDataMode(),
        identityChallenges: db.identityChallenges || [],
        subscription: getCommunitySubscription(communityId),
        entitlements: getCommunityEntitlements(communityId),
        referrals: (db.referrals || []).filter(r => r.communityId === communityId)
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  try {
    await ensureDatabaseHydrated(env);
    const authUser = await getAuthenticatedUserFromRequest(req);
    const body = (await req.json()) as Record<string, any>;
    const action = body.action as string | undefined;
    const payload = (body.payload ?? body ?? {}) as any;
    const db = getDatabase();

    const isUserSuspendedInCommunity = (userId: string, commId?: string) => {
      if (!userId || !commId) return false;
      const mem = (db.memberships || []).find(
        m => m.communityId === commId && m.userId === userId
      );
      return mem?.moderationStatus === 'suspended';
    };

    let result = null;

    switch (action) {
      case 'create_community': {
        const communityName = String(payload?.name || '').trim();
        if (!communityName) {
          return NextResponse.json({ success: false, error: 'Community name is required' }, { status: 400 });
        }
        const creatorId = authUser?.id || payload.ownerId || 'usr_sarah';

        // Entitlement Check: Free plan allows 1 community per owner. Community Pro required for multi-community ownership.
        const existingOwnedCommunities = db.communities.filter(c => c.ownerId === creatorId);
        if (existingOwnedCommunities.length >= 1) {
          // Check if any existing community is Pro
          const hasProSubscription = existingOwnedCommunities.some(c => {
            const sub = getCommunitySubscription(c.id);
            return sub.tier === 'pro' && sub.status === 'active';
          });
          if (!hasProSubscription && authUser?.platformRole !== 'platform_admin') {
            return NextResponse.json({
              success: false,
              error: 'Free plan includes 1 community. Upgrade to Community Pro ($15/month) to create and govern multiple communities.',
              upgradeUrl: `${WHOP_PRO_CHECKOUT_URL}?custom_community_id=${encodeURIComponent(existingOwnedCommunities[0].id)}`
            }, { status: 403 });
          }
        }

        result = dbOperations.createCommunity({
          name: communityName,
          slug: payload.slug || communityName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: payload.description || '',
          category: payload.category || 'General',
          avatar: payload.avatar || `https://picsum.photos/seed/${Date.now()}/200/200`,
          coverImage: payload.coverImage || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
          ownerId: creatorId,
          rules: payload.rules || ['Be respectful and transparent', 'Deliver on verified commitments'],
          discordConfig: { connected: false, status: 'not_configured' },
          telegramConfig: { connected: false, status: 'not_configured' },
          contributionCategories: [
            { id: 'cat_core', name: 'Core Deliverables', nameAr: 'المخرجات الأساسية', description: 'Major project milestones and deliverables', requiresReview: true },
            { id: 'cat_review', name: 'Quality & Audit', nameAr: 'الجودة والتدقيق', description: 'Peer reviews and test verifications', requiresReview: true }
          ]
        });
        break;
      }

      case 'join_community': {
        const userId = authUser?.id || payload.userId || 'usr_sarah';
        if (isUserSuspendedInCommunity(userId, payload.communityId)) {
          return NextResponse.json({ success: false, error: 'Your membership in this community is currently suspended.' }, { status: 403 });
        }

        // Entitlement enforcement: Check monthly active member limit (100 for Free, 1,000 for Pro)
        const memberLimitCheck = verifyCommunityEntitlement(payload.communityId, 'member_limit');
        if (!memberLimitCheck.allowed) {
          return NextResponse.json({
            success: false,
            error: memberLimitCheck.reason,
            upgradeUrl: memberLimitCheck.upgradeUrl
          }, { status: 403 });
        }

        result = dbOperations.joinCommunity(payload.communityId, userId);

        // Track referral conversion if a referralCode was passed
        if (payload.referralCode) {
          trackReferralEvent(payload.referralCode, 'conversion', userId);
        }
        break;
      }

      case 'create_request': {
        const creatorId = authUser?.id || payload.creatorId || 'usr_sarah';
        if (isUserSuspendedInCommunity(creatorId, payload.communityId)) {
          return NextResponse.json({ success: false, error: 'Suspended members cannot post requests in this community.' }, { status: 403 });
        }
        if (!String(payload.title || '').trim()) {
          return NextResponse.json({ success: false, error: 'Request title is required' }, { status: 400 });
        }
        result = dbOperations.createRequest({ ...payload, creatorId });
        break;
      }

      case 'create_offer':
      case 'submit_offer': {
        const memberId = authUser?.id || payload.memberId || 'usr_alex';
        if (isUserSuspendedInCommunity(memberId, payload.communityId)) {
          return NextResponse.json({ success: false, error: 'Suspended members cannot submit offers in this community.' }, { status: 403 });
        }
        result = dbOperations.createOffer({ ...payload, memberId });
        break;
      }

      case 'accept_offer': {
        const actorId = authUser?.id || payload.actorId || 'usr_sarah';
        const targetOffer = db.offers.find(o => o.id === payload.offerId);
        if (!targetOffer) {
          return NextResponse.json({ success: false, error: 'Offer not found' }, { status: 404 });
        }
        const targetRequest = db.requests.find(r => r.id === targetOffer.requestId);
        const role = getUserRoleInCommunity(actorId, targetOffer.communityId);
        const canAccept =
          targetRequest?.creatorId === actorId ||
          ['platform_admin', 'community_owner', 'admin', 'task_manager'].includes(role);
        if (!canAccept) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only the request creator or community staff can accept offers' },
            { status: 403 }
          );
        }
        result = dbOperations.acceptOffer(payload.offerId);
        break;
      }

      case 'update_checklist':
        result = dbOperations.updateTaskChecklist(payload.taskId, payload.checklistId, payload.completed);
        break;

      case 'complete_task': {
        const memberId = authUser?.id || payload.memberId || 'usr_alex';
        const targetTask = db.tasks.find(t => t.id === payload.taskId);
        if (targetTask && isUserSuspendedInCommunity(memberId, targetTask.communityId)) {
          return NextResponse.json({ success: false, error: 'Suspended members cannot submit deliverables in this community.' }, { status: 403 });
        }
        result = dbOperations.completeTaskWithEvidence(payload.taskId, payload.evidenceUrl, payload.description, memberId);
        break;
      }

      case 'submit_contribution': {
        const memberId = authUser?.id || payload.memberId || 'usr_alex';
        if (isUserSuspendedInCommunity(memberId, payload.communityId)) {
          return NextResponse.json({ success: false, error: 'Suspended members cannot submit contributions in this community.' }, { status: 403 });
        }
        result = dbOperations.submitContribution({ ...payload, memberId });
        break;
      }

      case 'review_contribution': {
        const reviewerId = authUser?.id || payload.reviewerId || 'usr_sarah';
        const contrib = db.contributions.find(c => c.id === payload.contributionId);
        const commId = contrib?.communityId || 'comm_devforge';
        const role = getUserRoleInCommunity(reviewerId, commId);
        if (!['platform_admin', 'community_owner', 'admin', 'moderator', 'reviewer'].includes(role)) {
          return NextResponse.json({ success: false, error: 'Unauthorized: only appointed reviewers or owners can review contributions' }, { status: 403 });
        }
        result = dbOperations.reviewContribution(payload.contributionId, reviewerId, payload.decision, payload.reason);
        break;
      }

      case 'file_dispute': {
        const filedById = authUser?.id || payload.filedById || 'usr_tariq';
        result = dbOperations.fileDispute({ ...payload, filedById });
        break;
      }

      case 'resolve_dispute': {
        const resolverId = authUser?.id || payload.reviewerId || 'usr_sarah';
        const dispute = db.disputes.find(d => d.id === payload.disputeId);
        const commId = dispute?.communityId || 'comm_devforge';
        const role = getUserRoleInCommunity(resolverId, commId);
        if (!['platform_admin', 'community_owner', 'admin'].includes(role)) {
          return NextResponse.json({ success: false, error: 'Unauthorized: only community owners or admins can resolve disputes' }, { status: 403 });
        }
        result = dbOperations.resolveDispute(payload.disputeId, resolverId, payload.resolution, payload.decision);
        break;
      }

      case 'create_poll': {
        const creatorId = authUser?.id || payload.creatorId || 'usr_sarah';
        result = dbOperations.createPoll({ ...payload, creatorId });
        break;
      }

      case 'cast_vote': {
        const voterId = authUser?.id || payload.userId || 'usr_alex';
        const poll = db.polls.find(p => p.id === payload.pollId);
        if (poll && isUserSuspendedInCommunity(voterId, poll.communityId)) {
          return NextResponse.json({ success: false, error: 'Suspended members cannot vote in this community.' }, { status: 403 });
        }
        result = dbOperations.castVote(payload.pollId, payload.alternativeId, voterId);
        break;
      }

      case 'convert_poll_to_plan': {
        const leadOwnerId = authUser?.id || payload.leadOwnerId || 'usr_sarah';
        const poll = db.polls.find(p => p.id === payload.pollId);
        const role = getUserRoleInCommunity(leadOwnerId, poll?.communityId || 'comm_devforge');
        if (!['platform_admin', 'community_owner', 'admin', 'task_manager'].includes(role)) {
          return NextResponse.json({ success: false, error: 'Unauthorized: only community staff can convert polls to execution plans' }, { status: 403 });
        }
        result = dbOperations.convertPollToPlan(payload.pollId, leadOwnerId, payload.planTitle, payload.agreedOutcome);
        break;
      }

      case 'create_link': {
        const actorId = authUser?.id || payload.actorId || 'usr_sarah';
        const commId = payload.communityId || 'comm_devforge';
        const role = getUserRoleInCommunity(actorId, commId);
        if (!['platform_admin', 'community_owner', 'admin', 'moderator'].includes(role)) {
          return NextResponse.json({ success: false, error: 'Unauthorized: only community owners or staff can create action links' }, { status: 403 });
        }
        result = dbOperations.createLink(payload);
        break;
      }

      case 'record_link_event':
        result = dbOperations.recordLinkEvent(payload.linkId, payload.eventType);
        break;

      case 'revoke_link': {
        const actorId = authUser?.id || payload.actorId || 'usr_sarah';
        const targetLink = db.links.find(l => l.id === payload.linkId);
        const role = getUserRoleInCommunity(actorId, targetLink?.communityId || 'comm_devforge');
        if (!['platform_admin', 'community_owner', 'admin', 'moderator'].includes(role)) {
          return NextResponse.json({ success: false, error: 'Unauthorized: only community owners or staff can revoke action links' }, { status: 403 });
        }
        result = dbOperations.revokeLink(payload.linkId);
        break;
      }

      case 'publish_knowledge': {
        const authorId = authUser?.id || payload.authorId || 'usr_sarah';
        if (isUserSuspendedInCommunity(authorId, payload.communityId)) {
          return NextResponse.json({ success: false, error: 'Suspended members cannot publish knowledge articles.' }, { status: 403 });
        }
        result = dbOperations.publishKnowledge({ ...payload, authorId });
        break;
      }

      case 'supersede_knowledge': {
        const authorId = authUser?.id || payload.authorId || 'usr_sarah';
        const oldArt = db.knowledge.find(k => k.id === payload.oldArticleId);
        const role = getUserRoleInCommunity(authorId, oldArt?.communityId || 'comm_devforge');
        if (oldArt && oldArt.authorId !== authorId && !['platform_admin', 'community_owner', 'admin', 'reviewer'].includes(role)) {
          return NextResponse.json({ success: false, error: 'Unauthorized: only the author or community staff can supersede knowledge articles' }, { status: 403 });
        }
        result = dbOperations.supersedeKnowledge(payload.oldArticleId, payload.newContent, authorId);
        break;
      }

      case 'update_passport': {
        const targetUserId = authUser?.id || payload.userId || 'usr_sarah';
        result = dbOperations.updatePassport(targetUserId, payload.passport);
        break;
      }

      case 'update_privacy': {
        const targetUserId = authUser?.id || payload.userId || 'usr_sarah';
        result = dbOperations.updatePrivacy(targetUserId, payload.privacy);
        break;
      }

      case 'update_passport_and_privacy': {
        const targetUserId = authUser?.id || payload.userId || 'usr_sarah';
        if (payload.passport) dbOperations.updatePassport(targetUserId, payload.passport);
        if (payload.privacy) dbOperations.updatePrivacy(targetUserId, payload.privacy);
        result = dbOperations.getUserById(targetUserId);
        break;
      }

      case 'link_platform': {
        const targetUserId = authUser?.id || payload.userId || 'usr_sarah';
        result = dbOperations.linkPlatformIdentity(targetUserId, payload.platform, payload.id, payload.username);
        break;
      }

      case 'unlink_platform': {
        const targetUserId = authUser?.id || payload.userId;
        if (!targetUserId) {
          return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }
        if (payload.platform !== 'discord' && payload.platform !== 'telegram') {
          return NextResponse.json({ success: false, error: 'Invalid platform specified' }, { status: 400 });
        }
        result = dbOperations.unlinkPlatformIdentity(targetUserId, payload.platform);
        break;
      }

      case 'create_handoff':
        result = dbOperations.createHandoff(payload);
        break;

      case 'accept_handoff':
        result = dbOperations.acceptHandoff(payload.handoffId);
        break;

      case 'declare_intent': {
        const memberId = authUser?.id || payload.memberId || 'usr_alex';
        result = dbOperations.declareIntent({ ...payload, memberId });
        break;
      }

      case 'book_appointment':
        result = dbOperations.bookAppointment(payload);
        break;

      case 'execute_agent_kit':
        result = dbOperations.executeAgentKit(payload.agentKitId, payload.outcomeDesc);
        break;

      case 'simulate_discord_command':
        result = dbOperations.runDiscordCommandSimulation(payload.commandName, payload.role, payload.inputParams);
        break;

      case 'run_e2e_tests':
        result = runAllJourneyVerifications();
        break;

      case 'set_data_mode':
        result = dbOperations.setDataMode(payload.mode);
        break;

      case 'reset_to_clean_production':
        result = dbOperations.resetToCleanProduction(payload.communityId);
        break;

      case 'restore_demo_seed':
        result = dbOperations.restoreDemoSeed();
        break;

      case 'create_identity_challenge': {
        const targetUserId = authUser?.id || payload.userId || 'usr_sarah';
        result = dbOperations.createIdentityChallenge(targetUserId, payload.platform);
        break;
      }

      case 'verify_identity_challenge':
        result = dbOperations.verifyIdentityChallenge(payload.code, payload.platformUserId, payload.platformUsername);
        break;

      case 'update_member_role': {
        const actorId = authUser?.id || payload.actorId || 'usr_sarah';
        const role = getUserRoleInCommunity(actorId, payload.communityId);
        if (!['platform_admin', 'community_owner', 'admin'].includes(role)) {
          return NextResponse.json({ success: false, error: 'Unauthorized: only community owners can manage member roles' }, { status: 403 });
        }
        result = dbOperations.updateCommunityMemberRole(payload.communityId, payload.userId, payload.role);
        break;
      }

      case 'update_community_config': {
        const actorId = authUser?.id || payload.actorId || 'usr_sarah';
        const role = getUserRoleInCommunity(actorId, payload.communityId);
        if (!['platform_admin', 'community_owner', 'admin'].includes(role)) {
          return NextResponse.json({ success: false, error: 'Unauthorized: only community owners can configure community settings' }, { status: 403 });
        }
        result = dbOperations.updateCommunityConfig(payload.communityId, payload.updates || payload.config || {});
        break;
      }

      case 'create_group_connection_challenge': {
        const actorId = authUser?.id || payload.actorId || 'usr_sarah';
        const role = getUserRoleInCommunity(actorId, payload.communityId);
        if (!['platform_admin', 'community_owner', 'admin'].includes(role)) {
          return NextResponse.json({ success: false, error: 'Unauthorized: only community owners can connect bots and groups' }, { status: 403 });
        }
        result = dbOperations.createGroupConnectionChallenge(payload.communityId, actorId, payload.platform || 'telegram');
        break;
      }

      case 'connect_discord_guild': {
        const actorId = authUser?.id || payload.actorId || 'usr_sarah';
        const role = getUserRoleInCommunity(actorId, payload.communityId);
        if (!['platform_admin', 'community_owner', 'admin'].includes(role)) {
          return NextResponse.json({ success: false, error: 'Unauthorized: only community owners can connect Discord servers' }, { status: 403 });
        }
        result = dbOperations.connectDiscordGuild(payload.communityId, payload.serverId, payload.serverName, payload.channelId, payload.permissions);
        break;
      }

      case 'verify_telegram_group': {
        result = dbOperations.verifyTelegramGroupConnection(
          payload.code,
          payload.chatId,
          payload.groupTitle,
          payload.senderId || 'tg_admin',
          payload.senderUsername || 'admin'
        );
        break;
      }

      case 'disconnect_platform': {
        const actorId = authUser?.id || payload.actorId || 'usr_sarah';
        const role = getUserRoleInCommunity(actorId, payload.communityId);
        if (!['platform_admin', 'community_owner', 'admin'].includes(role)) {
          return NextResponse.json({ success: false, error: 'Unauthorized: only community owners can disconnect integrations' }, { status: 403 });
        }
        result = dbOperations.disconnectPlatform(payload.communityId, payload.platform, payload.serverId || payload.groupId);
        break;
      }

      case 'save_menu_message': {
        const actorId = authUser?.id || payload.actorId || 'usr_sarah';
        const role = getUserRoleInCommunity(actorId, payload.communityId);
        if (!['platform_admin', 'community_owner', 'admin'].includes(role)) {
          return NextResponse.json({ success: false, error: 'Unauthorized: only community owners can publish community menus' }, { status: 403 });
        }
        result = dbOperations.saveMenuMessage(payload.communityId, payload.platform, payload.messageId, payload.channelId);
        break;
      }

      case 'update_user_profile': {
        const targetUserId = authUser?.id || payload.userId;
        const targetUser = db.users.find(u => u.id === targetUserId);
        if (!targetUser) {
          return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }
        if (payload.name) targetUser.name = payload.name;
        if (payload.bio) {
          targetUser.bio = payload.bio;
          if (targetUser.passport) targetUser.passport.biography = payload.bio;
        }
        if (Array.isArray(payload.languages) && targetUser.passport) {
          targetUser.passport.languages = payload.languages;
        }
        saveDatabase(db);
        result = { success: true, user: targetUser };
        break;
      }

      case 'create_announcement': {
        const actorId = authUser?.id || payload.authorId || 'usr_sarah';
        const commId = payload.communityId || 'comm_devforge';
        const role = getUserRoleInCommunity(actorId, commId);
        if (!['platform_admin', 'community_owner', 'admin', 'moderator'].includes(role)) {
          return NextResponse.json({ success: false, error: 'Unauthorized: only community staff can publish announcements' }, { status: 403 });
        }
        if (!String(payload.title || '').trim() || !String(payload.message || '').trim()) {
          return NextResponse.json({ success: false, error: 'Announcement title and message are required' }, { status: 400 });
        }
        result = await dbOperations.createAnnouncement(
          {
            communityId: commId,
            authorId: actorId,
            title: payload.title,
            message: payload.message,
            category: payload.category || 'update',
            pinned: Boolean(payload.pinned),
            channels: payload.channels || { inApp: true, discord: false, telegram: false }
          },
          env
        );
        break;
      }

      case 'toggle_announcement_pin': {
        const actorId = authUser?.id || payload.actorId || 'usr_sarah';
        const ann = (db.announcements || []).find(a => a.id === payload.announcementId);
        const role = getUserRoleInCommunity(actorId, ann?.communityId || payload.communityId || 'comm_devforge');
        if (!['platform_admin', 'community_owner', 'admin', 'moderator'].includes(role)) {
          return NextResponse.json({ success: false, error: 'Unauthorized: only community staff can pin announcements' }, { status: 403 });
        }
        result = dbOperations.toggleAnnouncementPin(payload.announcementId);
        break;
      }

      case 'create_invite_code': {
        const actorId = authUser?.id || payload.actorId || 'usr_sarah';
        const commId = payload.communityId || 'comm_devforge';
        const role = getUserRoleInCommunity(actorId, commId);
        if (!['platform_admin', 'community_owner', 'admin'].includes(role)) {
          return NextResponse.json({ success: false, error: 'Unauthorized: only community owners or admins can create invite codes' }, { status: 403 });
        }
        result = dbOperations.createInviteCode({
          communityId: commId,
          createdBy: actorId,
          roleAssigned: payload.roleAssigned || 'member',
          maxUses: Number(payload.maxUses || 25),
          expiresInDays: payload.expiresInDays ? Number(payload.expiresInDays) : undefined
        });
        break;
      }

      case 'revoke_invite_code': {
        const actorId = authUser?.id || payload.actorId || 'usr_sarah';
        const inv = (db.inviteCodes || []).find(i => i.id === payload.inviteId);
        const role = getUserRoleInCommunity(actorId, inv?.communityId || payload.communityId || 'comm_devforge');
        if (!['platform_admin', 'community_owner', 'admin'].includes(role)) {
          return NextResponse.json({ success: false, error: 'Unauthorized: only community owners or admins can revoke invite codes' }, { status: 403 });
        }
        result = dbOperations.revokeInviteCode(payload.inviteId);
        break;
      }

      case 'redeem_invite_code': {
        const userId = authUser?.id || payload.userId;
        if (!userId) {
          return NextResponse.json({ success: false, error: 'Authentication required to redeem invite code' }, { status: 401 });
        }
        const redeemed = dbOperations.redeemInviteCode(String(payload.code || ''), userId);
        if (!redeemed.success) {
          return NextResponse.json({ success: false, error: redeemed.error || 'Failed to redeem invite code' }, { status: 400 });
        }
        result = redeemed;
        break;
      }

      case 'moderate_member': {
        const actorId = authUser?.id || payload.actorId || 'usr_sarah';
        const commId = payload.communityId || 'comm_devforge';
        const role = getUserRoleInCommunity(actorId, commId);
        if (!['platform_admin', 'community_owner', 'admin', 'moderator'].includes(role)) {
          return NextResponse.json({ success: false, error: 'Unauthorized: moderation requires admin or moderator role' }, { status: 403 });
        }
        const modAction = payload.modAction || payload.moderationAction || payload.actionType || payload.decision;
        if (!payload.targetUserId || !['warn', 'suspend', 'reinstate', 'remove'].includes(modAction)) {
          return NextResponse.json({ success: false, error: 'Valid targetUserId and moderation action (warn|suspend|reinstate|remove) are required' }, { status: 400 });
        }
        result = dbOperations.moderateMember({
          communityId: commId,
          targetUserId: payload.targetUserId,
          actorId,
          action: modAction,
          reason: String(payload.reason || 'Moderated by community staff')
        });
        break;
      }

      case 'create_task': {
        const actorId = authUser?.id || payload.creatorId || 'usr_sarah';
        const commId = payload.communityId || 'comm_devforge';
        const role = getUserRoleInCommunity(actorId, commId);
        if (!['platform_admin', 'community_owner', 'admin', 'task_manager', 'moderator'].includes(role)) {
          return NextResponse.json({ success: false, error: 'Unauthorized: only community staff or task managers can create direct tasks' }, { status: 403 });
        }
        if (!String(payload.title || '').trim()) {
          return NextResponse.json({ success: false, error: 'Task title is required' }, { status: 400 });
        }
        result = dbOperations.createDirectTask({
          communityId: commId,
          creatorId: actorId,
          title: payload.title,
          description: payload.description || payload.title,
          expectedOutput: payload.expectedOutput,
          acceptanceCriteria: payload.acceptanceCriteria,
          assigneeId: payload.assigneeId || undefined,
          deadline: payload.deadline,
          checklistItems: Array.isArray(payload.checklistItems) ? payload.checklistItems : undefined,
          rewardRecognition: payload.rewardRecognition
        });
        break;
      }

      case 'claim_task': {
        const userId = authUser?.id || payload.userId;
        if (!userId) {
          return NextResponse.json({ success: false, error: 'Authentication required to claim tasks' }, { status: 401 });
        }
        const taskForCheck = db.tasks.find(t => t.id === payload.taskId);
        if (taskForCheck && isUserSuspendedInCommunity(userId, taskForCheck.communityId)) {
          return NextResponse.json({ success: false, error: 'Suspended members cannot claim tasks in this community.' }, { status: 403 });
        }
        const claimed = dbOperations.claimTask(payload.taskId, userId);
        if (!claimed) {
          return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
        }
        if ((claimed as any).error) {
          return NextResponse.json({ success: false, error: (claimed as any).error }, { status: 409 });
        }
        result = claimed;
        break;
      }

      case 'decline_offer': {
        const actorId = authUser?.id || payload.actorId || 'usr_sarah';
        const offer = db.offers.find(o => o.id === payload.offerId);
        const role = getUserRoleInCommunity(actorId, offer?.communityId || 'comm_devforge');
        if (!['platform_admin', 'community_owner', 'admin', 'task_manager'].includes(role)) {
          return NextResponse.json({ success: false, error: 'Unauthorized: only community owners or managers can decline offers' }, { status: 403 });
        }
        result = dbOperations.declineOffer(payload.offerId, actorId, payload.reason);
        break;
      }

      case 'create_event': {
        const actorId = authUser?.id || payload.creatorId || 'usr_sarah';
        const commId = payload.communityId || 'comm_devforge';
        const role = getUserRoleInCommunity(actorId, commId);
        if (!['platform_admin', 'community_owner', 'admin', 'event_organizer', 'moderator'].includes(role)) {
          return NextResponse.json({ success: false, error: 'Unauthorized: only organizers or admins can create events' }, { status: 403 });
        }
        if (!String(payload.title || '').trim() || !String(payload.date || '').trim()) {
          return NextResponse.json({ success: false, error: 'Event title and date are required' }, { status: 400 });
        }
        result = dbOperations.createEvent({
          communityId: commId,
          title: payload.title,
          description: payload.description || '',
          date: payload.date,
          location: payload.location || 'Community Hub',
          creatorId: actorId
        });
        break;
      }

      case 'rsvp_event': {
        const userId = authUser?.id || payload.userId;
        if (!userId) {
          return NextResponse.json({ success: false, error: 'Authentication required to RSVP' }, { status: 401 });
        }
        const evtForCheck = db.events.find(e => e.id === payload.eventId);
        if (evtForCheck && isUserSuspendedInCommunity(userId, evtForCheck.communityId)) {
          return NextResponse.json({ success: false, error: 'Suspended members cannot RSVP to community events.' }, { status: 403 });
        }
        result = dbOperations.rsvpEvent(payload.eventId, userId);
        break;
      }

      case 'confirm_event_attendance': {
        const actorId = authUser?.id || payload.actorId || 'usr_sarah';
        const evt = db.events.find(e => e.id === payload.eventId);
        const role = getUserRoleInCommunity(actorId, evt?.communityId || payload.communityId || 'comm_devforge');
        if (!['platform_admin', 'community_owner', 'admin', 'event_organizer', 'moderator'].includes(role)) {
          return NextResponse.json({ success: false, error: 'Unauthorized: only event organizers or admins can confirm attendance' }, { status: 403 });
        }
        result = dbOperations.confirmEventAttendance(payload.eventId, payload.userId, actorId, payload.evidenceNote);
        break;
      }

      case 'endorse_member_skill': {
        const actorId = authUser?.id || payload.endorserId;
        if (!actorId) {
          return NextResponse.json({ success: false, error: 'Authentication required to endorse peers' }, { status: 401 });
        }
        if (actorId === payload.targetUserId) {
          return NextResponse.json({ success: false, error: 'You cannot endorse your own skill' }, { status: 400 });
        }
        result = dbOperations.endorseMemberSkill(payload.targetUserId, payload.skillName, actorId, payload.communityId);
        break;
      }

      case 'mark_notification_read':
        result = dbOperations.markNotificationRead(payload.notificationId || payload.notifId);
        break;

      case 'mark_all_notifications_read': {
        const targetUserId = authUser?.id || payload.userId;
        if (!targetUserId) {
          return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }
        result = dbOperations.markAllNotificationsRead(targetUserId);
        break;
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, result, item: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
