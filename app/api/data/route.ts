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

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const communityId = url.searchParams.get('communityId') || 'comm_devforge';

    await ensureDatabaseHydrated();
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

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseHydrated();
    const authUser = await getAuthenticatedUserFromRequest(req);
    const body = (await req.json()) as { action?: string; payload?: any };
    const { action, payload } = body;
    const db = getDatabase();

    let result = null;

    switch (action) {
      case 'create_community': {
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
          name: payload.name,
          slug: payload.slug || payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
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
        result = dbOperations.createRequest({ ...payload, creatorId });
        break;
      }

      case 'create_offer':
      case 'submit_offer': {
        const memberId = authUser?.id || payload.memberId || 'usr_alex';
        result = dbOperations.createOffer({ ...payload, memberId });
        break;
      }

      case 'accept_offer':
        result = dbOperations.acceptOffer(payload.offerId);
        break;

      case 'update_checklist':
        result = dbOperations.updateTaskChecklist(payload.taskId, payload.checklistId, payload.completed);
        break;

      case 'complete_task': {
        const memberId = authUser?.id || payload.memberId || 'usr_alex';
        result = dbOperations.completeTaskWithEvidence(payload.taskId, payload.evidenceUrl, payload.description, memberId);
        break;
      }

      case 'submit_contribution': {
        const memberId = authUser?.id || payload.memberId || 'usr_alex';
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
        result = dbOperations.castVote(payload.pollId, payload.alternativeId, voterId);
        break;
      }

      case 'convert_poll_to_plan': {
        const leadOwnerId = authUser?.id || payload.leadOwnerId || 'usr_sarah';
        result = dbOperations.convertPollToPlan(payload.pollId, leadOwnerId, payload.planTitle, payload.agreedOutcome);
        break;
      }

      case 'create_link':
        result = dbOperations.createLink(payload);
        break;

      case 'record_link_event':
        result = dbOperations.recordLinkEvent(payload.linkId, payload.eventType);
        break;

      case 'revoke_link':
        result = dbOperations.revokeLink(payload.linkId);
        break;

      case 'publish_knowledge': {
        const authorId = authUser?.id || payload.authorId || 'usr_sarah';
        result = dbOperations.publishKnowledge({ ...payload, authorId });
        break;
      }

      case 'supersede_knowledge': {
        const authorId = authUser?.id || payload.authorId || 'usr_sarah';
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

      case 'link_platform': {
        const targetUserId = authUser?.id || payload.userId || 'usr_sarah';
        result = dbOperations.linkPlatformIdentity(targetUserId, payload.platform, payload.id, payload.username);
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

      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, result, item: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
