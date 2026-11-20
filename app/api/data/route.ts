// Community OS — Central Data & Actions API Route with Server-Side Authorization
import { NextRequest, NextResponse } from 'next/server';
import { dbOperations, ensureDatabaseHydrated, getDatabase, persistDatabaseNow, saveDatabase } from '@/lib/db/store';
import { computeCommunityAnalytics } from '@/lib/services/analytics';
import { runAllJourneyVerifications } from '@/lib/services/testingSuite';
import {
  clearSessionCookie,
  deleteUserAccount,
  getAuthenticatedUserFromRequest,
  getUserRoleInCommunity
} from '@/lib/services/auth';
import {
  getCommunitySubscription,
  getCommunityEntitlements,
  verifyCommunityEntitlement,
  trackReferralEvent,
  WHOP_PRO_CHECKOUT_URL
} from '@/lib/services/subscriptionService';
import { verifyCsrfProtection } from '@/lib/services/securityConfig';
import { checkRateLimit, getClientIp } from '@/lib/services/rateLimit';
import { sanitizeUrlList, validateEvidenceUrl } from '@/lib/services/validation';
import { getRuntimeEnv } from '@/lib/env';
import { User } from '@/lib/types';

function redactUserForViewer(u: User, viewer: User | null, isStaffViewer: boolean): User {
  const isSelf = Boolean(viewer && viewer.id === u.id);
  if (isSelf || isStaffViewer) {
    return u;
  }
  const privacy = u.privacy || {
    showBio: true,
    showSkills: true,
    showVerifiedOnly: false,
    allowDiscovery: true,
    allowCrossCommunitySharing: false,
    shareableRecordIds: []
  };
  const visibleSkills = !privacy.showSkills
    ? []
    : privacy.showVerifiedOnly
    ? (u.passport?.skills || []).filter((s) => s.verified)
    : u.passport?.skills || [];

  return {
    ...u,
    email: '', // Redact private email address from non-owners and guests
    bio: privacy.showBio ? u.bio : '',
    passport: {
      ...u.passport,
      biography: privacy.showBio ? u.passport?.biography || '' : '',
      skills: visibleSkills
    }
  };
}

export async function GET(req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  try {
    const url = new URL(req.url);
    const requestedCommunityId = url.searchParams.get('communityId');
    const communityId = requestedCommunityId || 'comm_devforge';

    await ensureDatabaseHydrated(env);
    const authUser = await getAuthenticatedUserFromRequest(req);
    const db = getDatabase();
    const communities = dbOperations.getCommunities();

    if (requestedCommunityId && requestedCommunityId !== 'all') {
      const exists = dbOperations.getCommunityById(requestedCommunityId);
      if (!exists) {
        return NextResponse.json(
          { success: false, error: `Community "${requestedCommunityId}" not found` },
          { status: 404 }
        );
      }
    }

    const analytics = computeCommunityAnalytics(communityId);
    const currentCommunity =
      (communityId === 'all' ? communities[0] : dbOperations.getCommunityById(communityId)) || communities[0];

    const currentUserRole = authUser ? getUserRoleInCommunity(authUser.id, communityId) : 'guest';
    const isStaffViewer = Boolean(
      authUser &&
        (authUser.platformRole === 'platform_admin' ||
          ['platform_admin', 'community_owner', 'admin', 'moderator', 'reviewer'].includes(currentUserRole))
    );
    const isAdminOrOwner = Boolean(
      authUser &&
        (authUser.platformRole === 'platform_admin' ||
          ['platform_admin', 'community_owner', 'admin'].includes(currentUserRole))
    );

    const rawUsers = dbOperations.getUsers();
    const users = rawUsers.map((u) => redactUserForViewer(u, authUser, isStaffViewer));

    const requests = dbOperations.getRequests(communityId);
    const offers = dbOperations.getOffers(undefined, communityId);
    const tasks = dbOperations.getTasks(communityId);
    const contributions = dbOperations.getContributions(communityId);
    const expertProfiles = dbOperations.getExpertProfiles(communityId);
    const polls = dbOperations.getPolls(communityId);
    const links = dbOperations.getLinks(communityId).filter((l) => {
      if (isStaffViewer) return true;
      return l.audience === 'public' || Boolean(authUser);
    });
    const knowledge = dbOperations.getKnowledge(communityId);
    const disputes = dbOperations.getDisputes(communityId);
    const agentKits = dbOperations.getAgentKits(communityId);

    const auditLogs = isStaffViewer ? dbOperations.getAuditLogs(communityId) : [];
    const recoveryCandidates = isStaffViewer ? dbOperations.getMemberRecoveryCandidates(communityId) : [];
    const inviteCodes = isAdminOrOwner ? dbOperations.getInviteCodes(communityId) : [];
    const moderationActions = isStaffViewer
      ? (db.moderationActions || []).filter((m) => communityId === 'all' || m.communityId === communityId)
      : [];
    const ownerActionItems = isStaffViewer ? dbOperations.getOwnerActionItems(communityId) : [];
    const notifications = authUser ? dbOperations.getNotifications(authUser.id) : [];
    const identityChallenges = authUser
      ? (db.identityChallenges || []).filter((c) => c.userId === authUser.id)
      : [];
    const referrals = !authUser
      ? []
      : isStaffViewer
      ? (db.referrals || []).filter((r) => communityId === 'all' || r.communityId === communityId)
      : (db.referrals || []).filter((r) => r.referrerUserId === authUser.id);

    const discordTests = dbOperations.getDiscordTests();
    const miniAppTests = dbOperations.getMiniAppTests();

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
        commitments: db.commitments.filter((c) => communityId === 'all' || c.communityId === communityId),
        handoffs: db.handoffs.filter((h) => communityId === 'all' || h.communityId === communityId),
        intents: db.intents.filter((i) => communityId === 'all' || i.communityId === communityId),
        attestations: db.attestations.filter((a) => communityId === 'all' || a.communityId === communityId),
        outcomes: db.outcomes.filter((o) => communityId === 'all' || o.communityId === communityId),
        portfolioItems: db.portfolioItems,
        events: db.events.filter((e) => communityId === 'all' || e.communityId === communityId),
        announcements: dbOperations.getAnnouncements(communityId),
        inviteCodes,
        moderationActions,
        notifications,
        ownerActionItems,
        dataMode: dbOperations.getDataMode(),
        identityChallenges,
        subscription: getCommunitySubscription(communityId),
        entitlements: getCommunityEntitlements(communityId),
        referrals,
        plans: (db.plans || []).filter((p) => communityId === 'all' || p.communityId === communityId),
        appointments: authUser
          ? (db.appointments || []).filter(
              (a) =>
                (communityId === 'all' || a.communityId === communityId) &&
                (isStaffViewer || a.memberId === authUser.id)
            )
          : []
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
    const csrf = verifyCsrfProtection(req, env);
    if (!csrf.valid) {
      return NextResponse.json({ success: false, error: csrf.reason || 'CSRF validation failed' }, { status: 403 });
    }

    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ key: `api_data_post:${clientIp}`, limit: 120, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      );
    }

    await ensureDatabaseHydrated(env);
    const authUser = await getAuthenticatedUserFromRequest(req);
    const body = (await req.json()) as Record<string, any>;
    const action = body.action as string | undefined;
    const payload = (body.payload ?? body ?? {}) as any;
    const db = getDatabase();

    const PUBLIC_SAFE_ACTIONS = new Set(['record_link_event', 'resolve_action_link']);
    if (!action || (!authUser && !PUBLIC_SAFE_ACTIONS.has(action))) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in to perform this action.' },
        { status: 401 }
      );
    }

    const isUserSuspendedInCommunity = (userId: string, commId?: string) => {
      if (!userId || !commId) return false;
      const mem = (db.memberships || []).find(
        (m) => m.communityId === commId && m.userId === userId
      );
      return mem?.moderationStatus === 'suspended';
    };

    let result: any = null;

    switch (action) {
      case 'resolve_action_link': {
        const slug = String(payload.slug || '').trim();
        const resolved = dbOperations.resolveActionLinkAccess(slug, authUser);
        return NextResponse.json({ success: resolved.allowed, resolution: resolved }, { status: resolved.statusCode });
      }

      case 'record_link_event': {
        result = dbOperations.recordLinkEvent(payload.linkId, payload.eventType);
        if (!result) {
          return NextResponse.json({ success: false, error: 'Action link is inactive, expired, revoked, or reached max uses.' }, { status: 410 });
        }
        break;
      }

      case 'create_community': {
        const communityName = String(payload?.name || '').trim();
        if (!communityName) {
          return NextResponse.json({ success: false, error: 'Community name is required' }, { status: 400 });
        }
        const creatorId = authUser!.id;

        const existingOwnedCommunities = db.communities.filter((c) => c.ownerId === creatorId);
        if (existingOwnedCommunities.length >= 1) {
          const hasProSubscription = existingOwnedCommunities.some((c) => {
            const sub = getCommunitySubscription(c.id);
            return sub.tier === 'pro' && sub.status === 'active';
          });
          if (!hasProSubscription && authUser?.platformRole !== 'platform_admin') {
            return NextResponse.json(
              {
                success: false,
                error:
                  'Free plan includes 1 community. Upgrade to Community Pro ($15/month) to create and govern multiple communities.',
                upgradeUrl: `${WHOP_PRO_CHECKOUT_URL}?custom_community_id=${encodeURIComponent(existingOwnedCommunities[0].id)}`
              },
              { status: 403 }
            );
          }
        }

        result = dbOperations.createCommunity({
          name: communityName,
          slug: payload.slug || communityName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: payload.description || '',
          category: payload.category || 'General',
          avatar: payload.avatar || `https://picsum.photos/seed/${Date.now()}/200/200`,
          coverImage:
            payload.coverImage ||
            'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
          ownerId: creatorId,
          rules: payload.rules || ['Be respectful and transparent', 'Deliver on verified commitments'],
          discordConfig: { connected: false, status: 'not_configured' },
          telegramConfig: { connected: false, status: 'not_configured' },
          contributionCategories: [
            {
              id: 'cat_core',
              name: 'Core Deliverables',
              nameAr: 'المخرجات الأساسية',
              description: 'Major project milestones and deliverables',
              requiresReview: true
            },
            {
              id: 'cat_review',
              name: 'Quality & Audit',
              nameAr: 'الجودة والتدقيق',
              description: 'Peer reviews and test verifications',
              requiresReview: true
            }
          ]
        });
        break;
      }

      case 'join_community': {
        const userId = authUser!.id;
        if (!db.communities.some((c) => c.id === payload.communityId)) {
          return NextResponse.json({ success: false, error: 'Community not found' }, { status: 404 });
        }
        if (isUserSuspendedInCommunity(userId, payload.communityId)) {
          return NextResponse.json(
            { success: false, error: 'Your membership in this community is currently suspended.' },
            { status: 403 }
          );
        }

        const memberLimitCheck = verifyCommunityEntitlement(payload.communityId, 'member_limit');
        if (!memberLimitCheck.allowed) {
          return NextResponse.json(
            {
              success: false,
              error: memberLimitCheck.reason,
              upgradeUrl: memberLimitCheck.upgradeUrl
            },
            { status: 403 }
          );
        }

        result = dbOperations.joinCommunity(payload.communityId, userId);

        if (payload.referralCode) {
          trackReferralEvent(payload.referralCode, 'conversion', userId);
        }
        break;
      }

      case 'leave_community': {
        const leaveRes = dbOperations.leaveCommunity(String(payload.communityId || ''), authUser!.id);
        if (!leaveRes.success) {
          return NextResponse.json({ success: false, error: leaveRes.error }, { status: 400 });
        }
        result = leaveRes;
        break;
      }

      case 'create_request': {
        const creatorId = authUser!.id;
        if (isUserSuspendedInCommunity(creatorId, payload.communityId)) {
          return NextResponse.json(
            { success: false, error: 'Suspended members cannot post requests in this community.' },
            { status: 403 }
          );
        }
        if (!String(payload.title || '').trim()) {
          return NextResponse.json({ success: false, error: 'Request title is required' }, { status: 400 });
        }
        result = dbOperations.createRequest({ ...payload, creatorId });
        break;
      }

      case 'update_request_status': {
        const actorId = authUser!.id;
        const targetReq = db.requests.find((r) => r.id === payload.requestId);
        if (!targetReq) {
          return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
        }
        const role = getUserRoleInCommunity(actorId, targetReq.communityId);
        const canUpdate =
          targetReq.creatorId === actorId ||
          targetReq.assignedMemberId === actorId ||
          ['platform_admin', 'community_owner', 'admin', 'moderator', 'task_manager'].includes(role);
        if (!canUpdate) {
          return NextResponse.json({ success: false, error: 'Unauthorized to update request status' }, { status: 403 });
        }
        const validStatuses = ['open', 'receiving_offers', 'matched', 'in_progress', 'completed', 'closed', 'disputed'];
        if (!validStatuses.includes(payload.status)) {
          return NextResponse.json({ success: false, error: 'Invalid request status' }, { status: 400 });
        }
        result = dbOperations.updateRequestStatus(payload.requestId, payload.status, payload.notes);
        break;
      }

      case 'create_offer':
      case 'submit_offer': {
        const memberId = authUser!.id;
        if (isUserSuspendedInCommunity(memberId, payload.communityId)) {
          return NextResponse.json(
            { success: false, error: 'Suspended members cannot submit offers in this community.' },
            { status: 403 }
          );
        }
        if (payload.portfolioLinks) {
          const urlCheck = sanitizeUrlList(payload.portfolioLinks);
          if (!urlCheck.valid) {
            return NextResponse.json({ success: false, error: urlCheck.error }, { status: 400 });
          }
          payload.portfolioLinks = urlCheck.sanitized;
        }
        result = dbOperations.createOffer({ ...payload, memberId });
        break;
      }

      case 'accept_offer': {
        const actorId = authUser!.id;
        const targetOffer = db.offers.find((o) => o.id === payload.offerId);
        if (!targetOffer) {
          return NextResponse.json({ success: false, error: 'Offer not found' }, { status: 404 });
        }
        const targetRequest = db.requests.find((r) => r.id === targetOffer.requestId);
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
        const acceptRes = dbOperations.acceptOffer(payload.offerId);
        if (acceptRes && (acceptRes as any).error) {
          return NextResponse.json({ success: false, error: (acceptRes as any).error }, { status: 409 });
        }
        result = acceptRes;
        break;
      }

      case 'update_checklist': {
        const actorId = authUser!.id;
        const targetTask = db.tasks.find((t) => t.id === payload.taskId);
        if (!targetTask) {
          return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
        }
        if (isUserSuspendedInCommunity(actorId, targetTask.communityId)) {
          return NextResponse.json(
            { success: false, error: 'Suspended members cannot update task checklists.' },
            { status: 403 }
          );
        }
        const role = getUserRoleInCommunity(actorId, targetTask.communityId);
        const isStaff = ['platform_admin', 'community_owner', 'admin', 'task_manager', 'moderator'].includes(role);
        if (targetTask.assigneeId && targetTask.assigneeId !== actorId && !isStaff) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only the assignee or community staff can update this checklist' },
            { status: 403 }
          );
        }
        result = dbOperations.updateTaskChecklist(payload.taskId, payload.checklistId, Boolean(payload.completed));
        break;
      }

      case 'complete_task': {
        const memberId = authUser!.id;
        const targetTask = db.tasks.find((t) => t.id === payload.taskId);
        if (!targetTask) {
          return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
        }
        if (targetTask.status === 'completed') {
          return NextResponse.json(
            { success: false, error: 'Task has already been completed and submitted for review.' },
            { status: 409 }
          );
        }
        if (isUserSuspendedInCommunity(memberId, targetTask.communityId)) {
          return NextResponse.json(
            { success: false, error: 'Suspended members cannot submit deliverables in this community.' },
            { status: 403 }
          );
        }
        const role = getUserRoleInCommunity(memberId, targetTask.communityId);
        const isStaff = ['platform_admin', 'community_owner', 'admin', 'task_manager'].includes(role);
        if (targetTask.assigneeId && targetTask.assigneeId !== memberId && !isStaff) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only the task assignee or community staff can complete this task.' },
            { status: 403 }
          );
        }
        const evCheck = validateEvidenceUrl(payload.evidenceUrl);
        if (!evCheck.valid || !evCheck.normalized) {
          return NextResponse.json({ success: false, error: evCheck.error }, { status: 400 });
        }
        const compRes = dbOperations.completeTaskWithEvidence(
          payload.taskId,
          evCheck.normalized,
          payload.description,
          memberId
        );
        if (compRes && (compRes as any).error) {
          return NextResponse.json({ success: false, error: (compRes as any).error }, { status: 400 });
        }
        result = compRes;
        break;
      }

      case 'submit_contribution': {
        const memberId = authUser!.id;
        if (isUserSuspendedInCommunity(memberId, payload.communityId)) {
          return NextResponse.json(
            { success: false, error: 'Suspended members cannot submit contributions in this community.' },
            { status: 403 }
          );
        }
        try {
          result = dbOperations.submitContribution({ ...payload, memberId });
        } catch (err: any) {
          return NextResponse.json({ success: false, error: err?.message || 'Invalid contribution data' }, { status: 400 });
        }
        break;
      }

      case 'resubmit_contribution': {
        const resub = dbOperations.resubmitContribution(
          String(payload.contributionId || ''),
          authUser!.id,
          String(payload.evidenceUrl || ''),
          payload.description
        );
        if (!resub.success) {
          return NextResponse.json({ success: false, error: resub.error }, { status: 400 });
        }
        result = resub.contribution;
        break;
      }

      case 'confirm_contribution_second_party': {
        const actorId = authUser!.id;
        const contrib = db.contributions.find((c) => c.id === payload.contributionId);
        if (!contrib) {
          return NextResponse.json({ success: false, error: 'Contribution not found' }, { status: 404 });
        }
        if (isUserSuspendedInCommunity(actorId, contrib.communityId)) {
          return NextResponse.json({ success: false, error: 'Suspended members cannot attest contributions.' }, { status: 403 });
        }
        const confRes = dbOperations.confirmContributionSecondParty(contrib.id, actorId, payload.note);
        if (!confRes.success) {
          return NextResponse.json({ success: false, error: confRes.error }, { status: 400 });
        }
        result = confRes.contribution;
        break;
      }

      case 'review_contribution': {
        const reviewerId = authUser!.id;
        const contrib = db.contributions.find((c) => c.id === payload.contributionId);
        if (!contrib) {
          return NextResponse.json({ success: false, error: 'Contribution not found' }, { status: 404 });
        }
        const role = getUserRoleInCommunity(reviewerId, contrib.communityId);
        if (!['platform_admin', 'community_owner', 'admin', 'moderator', 'reviewer'].includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only appointed reviewers or owners can review contributions' },
            { status: 403 }
          );
        }
        const validDecisions = ['verified', 'rejected', 'revision_requested', 'disputed'];
        if (!validDecisions.includes(payload.decision)) {
          return NextResponse.json({ success: false, error: 'Invalid review decision' }, { status: 400 });
        }
        const revRes = dbOperations.reviewContribution(
          payload.contributionId,
          reviewerId,
          payload.decision,
          String(payload.reason || '')
        );
        if (revRes && (revRes as any).error) {
          return NextResponse.json({ success: false, error: (revRes as any).error }, { status: 400 });
        }
        result = revRes;
        break;
      }

      case 'file_dispute': {
        const filedById = authUser!.id;
        if (isUserSuspendedInCommunity(filedById, payload.communityId)) {
          return NextResponse.json(
            { success: false, error: 'Suspended members cannot file disputes in this community.' },
            { status: 403 }
          );
        }
        if (payload.evidenceLinks) {
          const urlCheck = sanitizeUrlList(payload.evidenceLinks);
          if (!urlCheck.valid) {
            return NextResponse.json({ success: false, error: urlCheck.error }, { status: 400 });
          }
          payload.evidenceLinks = urlCheck.sanitized;
        }
        result = dbOperations.fileDispute({ ...payload, filedById });
        break;
      }

      case 'appeal_dispute': {
        const appealRes = dbOperations.appealDispute(
          String(payload.disputeId || ''),
          authUser!.id,
          String(payload.appealNotes || payload.reason || ''),
          payload.evidenceLinks
        );
        if (!appealRes.success) {
          return NextResponse.json({ success: false, error: appealRes.error }, { status: 400 });
        }
        result = appealRes.dispute;
        break;
      }

      case 'resolve_dispute': {
        const resolverId = authUser!.id;
        const dispute = db.disputes.find((d) => d.id === payload.disputeId);
        if (!dispute) {
          return NextResponse.json({ success: false, error: 'Dispute not found' }, { status: 404 });
        }
        const role = getUserRoleInCommunity(resolverId, dispute.communityId);
        if (!['platform_admin', 'community_owner', 'admin'].includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only community owners or admins can resolve disputes' },
            { status: 403 }
          );
        }
        result = dbOperations.resolveDispute(payload.disputeId, resolverId, payload.resolution, payload.decision);
        break;
      }

      case 'create_poll': {
        const creatorId = authUser!.id;
        if (isUserSuspendedInCommunity(creatorId, payload.communityId)) {
          return NextResponse.json(
            { success: false, error: 'Suspended members cannot create polls in this community.' },
            { status: 403 }
          );
        }
        result = dbOperations.createPoll({ ...payload, creatorId });
        break;
      }

      case 'create_commitment': {
        const committedById = authUser!.id;
        const commId = payload.communityId || 'comm_devforge';
        if (isUserSuspendedInCommunity(committedById, commId)) {
          return NextResponse.json(
            { success: false, error: 'Suspended members cannot create commitments in this community.' },
            { status: 403 }
          );
        }
        if (!String(payload.agreedWhat || '').trim()) {
          return NextResponse.json({ success: false, error: 'Commitment agreement description is required.' }, { status: 400 });
        }
        result = dbOperations.createCommitment({
          communityId: commId,
          agreedWhat: String(payload.agreedWhat),
          committedById,
          expectingDeliveryId: payload.expectingDeliveryId || 'usr_sarah',
          deadline: payload.deadline,
          relatedRequestId: payload.relatedRequestId
        });
        break;
      }

      case 'cast_vote': {
        const voterId = authUser!.id;
        const poll = db.polls.find((p) => p.id === payload.pollId);
        if (!poll) {
          return NextResponse.json({ success: false, error: 'Poll not found' }, { status: 404 });
        }
        if (isUserSuspendedInCommunity(voterId, poll.communityId)) {
          return NextResponse.json(
            { success: false, error: 'Suspended members cannot vote in this community.' },
            { status: 403 }
          );
        }
        result = dbOperations.castVote(payload.pollId, payload.alternativeId, voterId);
        break;
      }

      case 'convert_poll_to_plan': {
        const leadOwnerId = authUser!.id;
        const poll = db.polls.find((p) => p.id === payload.pollId);
        const role = getUserRoleInCommunity(leadOwnerId, poll?.communityId || 'comm_devforge');
        if (!['platform_admin', 'community_owner', 'admin', 'task_manager'].includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only community staff can convert polls to execution plans' },
            { status: 403 }
          );
        }
        result = dbOperations.convertPollToPlan(payload.pollId, leadOwnerId, payload.planTitle, payload.agreedOutcome);
        break;
      }

      case 'create_link': {
        const actorId = authUser!.id;
        const commId = payload.communityId || 'comm_devforge';
        const role = getUserRoleInCommunity(actorId, commId);
        if (!['platform_admin', 'community_owner', 'admin', 'moderator'].includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only community owners or staff can create action links' },
            { status: 403 }
          );
        }
        if (!String(payload.title || '').trim() || !String(payload.slug || '').trim()) {
          return NextResponse.json({ success: false, error: 'Link title and slug are required' }, { status: 400 });
        }
        result = dbOperations.createLink({
          communityId: commId,
          linkType: payload.linkType || 'link_9_help_request',
          slug: String(payload.slug),
          title: String(payload.title).trim(),
          description: String(payload.description || '').trim(),
          audience: payload.audience || 'public',
          requiredRole: payload.requiredRole || undefined,
          expiresAt: payload.expiresAt || undefined,
          maxUses: payload.maxUses ? Number(payload.maxUses) : undefined,
          targetEntityId: payload.targetEntityId || undefined
        });
        break;
      }

      case 'revoke_link': {
        const actorId = authUser!.id;
        const targetLink = db.links.find((l) => l.id === payload.linkId);
        const role = getUserRoleInCommunity(actorId, targetLink?.communityId || 'comm_devforge');
        if (!['platform_admin', 'community_owner', 'admin', 'moderator'].includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only community owners or staff can revoke action links' },
            { status: 403 }
          );
        }
        result = dbOperations.revokeLink(payload.linkId);
        break;
      }

      case 'publish_knowledge': {
        const authorId = authUser!.id;
        if (isUserSuspendedInCommunity(authorId, payload.communityId)) {
          return NextResponse.json(
            { success: false, error: 'Suspended members cannot publish knowledge articles.' },
            { status: 403 }
          );
        }
        if (Array.isArray(payload.sources)) {
          for (const src of payload.sources) {
            if (src?.url) {
              const check = validateEvidenceUrl(src.url);
              if (!check.valid) {
                return NextResponse.json({ success: false, error: check.error }, { status: 400 });
              }
            }
          }
        }
        result = dbOperations.publishKnowledge({ ...payload, authorId });
        break;
      }

      case 'supersede_knowledge': {
        const authorId = authUser!.id;
        const oldArt = db.knowledge.find((k) => k.id === payload.oldArticleId);
        const role = getUserRoleInCommunity(authorId, oldArt?.communityId || 'comm_devforge');
        if (
          oldArt &&
          oldArt.authorId !== authorId &&
          !['platform_admin', 'community_owner', 'admin', 'reviewer'].includes(role)
        ) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only the author or community staff can supersede knowledge articles' },
            { status: 403 }
          );
        }
        result = dbOperations.supersedeKnowledge(payload.oldArticleId, payload.newContent, authorId);
        break;
      }

      case 'update_passport': {
        const targetUserId = authUser!.id;
        if (payload.passport?.portfolioLinks) {
          const check = sanitizeUrlList(payload.passport.portfolioLinks);
          if (!check.valid) {
            return NextResponse.json({ success: false, error: check.error }, { status: 400 });
          }
          payload.passport.portfolioLinks = check.sanitized;
        }
        result = dbOperations.updatePassport(targetUserId, payload.passport);
        break;
      }

      case 'update_privacy': {
        const targetUserId = authUser!.id;
        result = dbOperations.updatePrivacy(targetUserId, payload.privacy);
        break;
      }

      case 'update_passport_and_privacy': {
        const targetUserId = authUser!.id;
        if (payload.passport?.portfolioLinks) {
          const check = sanitizeUrlList(payload.passport.portfolioLinks);
          if (!check.valid) {
            return NextResponse.json({ success: false, error: check.error }, { status: 400 });
          }
          payload.passport.portfolioLinks = check.sanitized;
        }
        if (payload.passport) dbOperations.updatePassport(targetUserId, payload.passport);
        if (payload.privacy) dbOperations.updatePrivacy(targetUserId, payload.privacy);
        result = dbOperations.getUserById(targetUserId);
        break;
      }

      case 'export_my_data': {
        result = dbOperations.exportUserPersonalData(authUser!.id);
        break;
      }

      case 'delete_account': {
        const delRes = deleteUserAccount(authUser!.id, env);
        if (!delRes.success) {
          return NextResponse.json({ success: false, error: delRes.error }, { status: 400 });
        }
        await persistDatabaseNow(env);
        const res = NextResponse.json({ success: true, result: { deleted: true } });
        clearSessionCookie(res, { req });
        return res;
      }

      case 'link_platform': {
        const targetUserId = authUser!.id;
        result = dbOperations.linkPlatformIdentity(targetUserId, payload.platform, payload.id, payload.username);
        break;
      }

      case 'unlink_platform': {
        const targetUserId = authUser!.id;
        if (payload.platform !== 'discord' && payload.platform !== 'telegram') {
          return NextResponse.json({ success: false, error: 'Invalid platform specified' }, { status: 400 });
        }
        result = dbOperations.unlinkPlatformIdentity(targetUserId, payload.platform);
        break;
      }

      case 'create_handoff':
        result = dbOperations.createHandoff({ ...payload, previousOwnerId: authUser!.id });
        break;

      case 'accept_handoff': {
        const actorId = authUser!.id;
        const handoff = db.handoffs.find((h) => h.id === payload.handoffId);
        if (!handoff) {
          return NextResponse.json({ success: false, error: 'Handoff not found' }, { status: 404 });
        }
        const role = getUserRoleInCommunity(actorId, handoff.communityId);
        const isStaff = ['platform_admin', 'community_owner', 'admin', 'task_manager'].includes(role);
        if (actorId !== handoff.nextOwnerId && !isStaff) {
          return NextResponse.json(
            {
              success: false,
              error: 'Unauthorized: only the incoming owner or community staff can accept this handoff'
            },
            { status: 403 }
          );
        }
        result = dbOperations.acceptHandoff(payload.handoffId);
        break;
      }

      case 'declare_intent': {
        const memberId = authUser!.id;
        result = dbOperations.declareIntent({ ...payload, memberId });
        break;
      }

      case 'book_appointment':
        result = dbOperations.bookAppointment({ ...payload, memberId: authUser!.id });
        break;

      case 'execute_agent_kit': {
        const actorId = authUser!.id;
        const kit = db.agentKits.find((a) => a.id === payload.agentKitId);
        if (!kit) {
          return NextResponse.json({ success: false, error: 'Agent workflow kit not found' }, { status: 404 });
        }
        const role = getUserRoleInCommunity(actorId, kit.communityId);
        if (!['platform_admin', 'community_owner', 'admin', 'moderator', 'task_manager'].includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only community staff can run automation kits' },
            { status: 403 }
          );
        }
        result = dbOperations.executeAgentKit(payload.agentKitId, payload.outcomeDesc);
        break;
      }

      case 'send_recovery_prompt': {
        const actorId = authUser!.id;
        const commId = payload.communityId || 'comm_devforge';
        const role = getUserRoleInCommunity(actorId, commId);
        if (!['platform_admin', 'community_owner', 'admin', 'moderator'].includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only community owners or moderators can send recovery prompts' },
            { status: 403 }
          );
        }
        if (!payload.targetUserId) {
          return NextResponse.json({ success: false, error: 'targetUserId is required' }, { status: 400 });
        }
        result = dbOperations.sendRecoveryPrompt(commId, payload.targetUserId, actorId);
        if (!result) {
          return NextResponse.json({ success: false, error: 'Target user not found' }, { status: 404 });
        }
        break;
      }

      case 'export_audit_logs': {
        const commId = payload.communityId || 'comm_devforge';
        const role = getUserRoleInCommunity(authUser!.id, commId);
        if (!['platform_admin', 'community_owner', 'admin', 'moderator'].includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only community owners or staff can export audit logs' },
            { status: 403 }
          );
        }
        const logs = dbOperations.getAuditLogs(commId);
        const csvHeader = 'id,communityId,actorId,action,details,timestamp\n';
        const csvRows = logs
          .map(
            (l) =>
              `"${String(l.id).replace(/"/g, '""')}","${String(l.communityId).replace(/"/g, '""')}","${String(l.actorId).replace(/"/g, '""')}","${String(l.action).replace(/"/g, '""')}","${String(l.details).replace(/"/g, '""')}","${String(l.timestamp).replace(/"/g, '""')}"`
          )
          .join('\n');
        result = { logs, csv: csvHeader + csvRows, exportedAt: new Date().toISOString() };
        break;
      }

      case 'simulate_discord_command': {
        const commId = payload.communityId || 'comm_devforge';
        const role = getUserRoleInCommunity(authUser!.id, commId);
        if (!['platform_admin', 'community_owner', 'admin', 'moderator'].includes(role)) {
          return NextResponse.json({ success: false, error: 'Unauthorized: staff role required' }, { status: 403 });
        }
        result = dbOperations.runDiscordCommandSimulation(payload.commandName, payload.role, payload.inputParams);
        break;
      }

      case 'run_e2e_tests': {
        if (authUser!.platformRole !== 'platform_admin' && authUser!.platformRole !== 'community_owner') {
          const ownsAny = db.communities.some((c) => c.ownerId === authUser!.id);
          if (!ownsAny) {
            return NextResponse.json({ success: false, error: 'Unauthorized: owner or admin required' }, { status: 403 });
          }
        }
        result = runAllJourneyVerifications();
        break;
      }

      case 'set_data_mode': {
        const actorId = authUser!.id;
        const commId = payload.communityId || 'comm_devforge';
        const role = getUserRoleInCommunity(actorId, commId);
        const isAnyOwner = db.communities.some((c) => c.ownerId === actorId);
        if (!isAnyOwner && !['platform_admin', 'community_owner', 'admin'].includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only community owners or admins can change platform data mode' },
            { status: 403 }
          );
        }
        result = dbOperations.setDataMode(payload.mode);
        break;
      }

      case 'reset_to_clean_production': {
        const actorId = authUser!.id;
        const commId = payload.communityId || 'comm_devforge';
        const role = getUserRoleInCommunity(actorId, commId);
        const isAnyOwner = db.communities.some((c) => c.ownerId === actorId);
        if (!isAnyOwner && !['platform_admin', 'community_owner', 'admin'].includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only community owners or admins can reset workspace data' },
            { status: 403 }
          );
        }
        result = dbOperations.resetToCleanProduction(payload.communityId);
        break;
      }

      case 'restore_demo_seed': {
        if (env.NODE_ENV === 'production' && authUser!.platformRole !== 'platform_admin') {
          return NextResponse.json({ success: false, error: 'Restricted in production environment' }, { status: 403 });
        }
        const actorId = authUser!.id;
        const commId = payload.communityId || 'comm_devforge';
        const role = getUserRoleInCommunity(actorId, commId);
        const isAnyOwner = db.communities.some((c) => c.ownerId === actorId);
        if (!isAnyOwner && !['platform_admin', 'community_owner', 'admin'].includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only community owners or admins can restore demo seed' },
            { status: 403 }
          );
        }
        result = dbOperations.restoreDemoSeed();
        break;
      }

      case 'create_identity_challenge': {
        const targetUserId = authUser!.id;
        result = dbOperations.createIdentityChallenge(targetUserId, payload.platform);
        break;
      }

      case 'verify_identity_challenge':
        result = dbOperations.verifyIdentityChallenge(payload.code, payload.platformUserId, payload.platformUsername);
        break;

      case 'update_member_role': {
        const actorId = authUser!.id;
        const role = getUserRoleInCommunity(actorId, payload.communityId);
        if (!['platform_admin', 'community_owner', 'admin'].includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only community owners can manage member roles' },
            { status: 403 }
          );
        }
        result = dbOperations.updateCommunityMemberRole(payload.communityId, payload.userId, payload.role, actorId);
        break;
      }

      case 'update_community_config': {
        const actorId = authUser!.id;
        const role = getUserRoleInCommunity(actorId, payload.communityId);
        if (!['platform_admin', 'community_owner', 'admin'].includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only community owners can configure community settings' },
            { status: 403 }
          );
        }
        result = dbOperations.updateCommunityConfig(payload.communityId, payload.updates || payload.config || {});
        break;
      }

      case 'create_group_connection_challenge': {
        const actorId = authUser!.id;
        const role = getUserRoleInCommunity(actorId, payload.communityId);
        if (!['platform_admin', 'community_owner', 'admin'].includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only community owners can connect bots and groups' },
            { status: 403 }
          );
        }
        result = dbOperations.createGroupConnectionChallenge(payload.communityId, actorId, payload.platform || 'telegram');
        break;
      }

      case 'connect_discord_guild': {
        const actorId = authUser!.id;
        const role = getUserRoleInCommunity(actorId, payload.communityId);
        if (!['platform_admin', 'community_owner', 'admin'].includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only community owners can connect Discord servers' },
            { status: 403 }
          );
        }
        result = dbOperations.connectDiscordGuild(
          payload.communityId,
          payload.serverId,
          payload.serverName,
          payload.channelId,
          payload.permissions
        );
        break;
      }

      case 'verify_telegram_group': {
        const actorId = authUser!.id;
        if (payload.communityId) {
          const role = getUserRoleInCommunity(actorId, payload.communityId);
          if (!['platform_admin', 'community_owner', 'admin'].includes(role)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
          }
        }
        result = dbOperations.verifyTelegramGroupConnection(
          payload.code,
          payload.chatId,
          payload.groupTitle,
          payload.senderId || actorId,
          payload.senderUsername || authUser!.name
        );
        break;
      }

      case 'disconnect_platform': {
        const actorId = authUser!.id;
        const role = getUserRoleInCommunity(actorId, payload.communityId);
        if (!['platform_admin', 'community_owner', 'admin'].includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only community owners can disconnect integrations' },
            { status: 403 }
          );
        }
        result = dbOperations.disconnectPlatform(payload.communityId, payload.platform, payload.serverId || payload.groupId);
        break;
      }

      case 'save_menu_message': {
        const actorId = authUser!.id;
        const role = getUserRoleInCommunity(actorId, payload.communityId);
        if (!['platform_admin', 'community_owner', 'admin'].includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only community owners can publish community menus' },
            { status: 403 }
          );
        }
        result = dbOperations.saveMenuMessage(payload.communityId, payload.platform, payload.messageId, payload.channelId);
        break;
      }

      case 'update_user_profile': {
        const targetUserId = authUser!.id;
        const targetUser = db.users.find((u) => u.id === targetUserId);
        if (!targetUser) {
          return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }
        if (payload.name) targetUser.name = payload.name;
        if (payload.bio !== undefined) {
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
        const actorId = authUser!.id;
        const commId = payload.communityId || 'comm_devforge';
        const role = getUserRoleInCommunity(actorId, commId);
        if (!['platform_admin', 'community_owner', 'admin', 'moderator'].includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only community staff can publish announcements' },
            { status: 403 }
          );
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
        const actorId = authUser!.id;
        const ann = (db.announcements || []).find((a) => a.id === payload.announcementId);
        const role = getUserRoleInCommunity(actorId, ann?.communityId || payload.communityId || 'comm_devforge');
        if (!['platform_admin', 'community_owner', 'admin', 'moderator'].includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only community staff can pin announcements' },
            { status: 403 }
          );
        }
        result = dbOperations.toggleAnnouncementPin(payload.announcementId);
        break;
      }

      case 'create_invite_code': {
        const actorId = authUser!.id;
        const commId = payload.communityId || 'comm_devforge';
        const role = getUserRoleInCommunity(actorId, commId);
        if (!['platform_admin', 'community_owner', 'admin'].includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only community owners or admins can create invite codes' },
            { status: 403 }
          );
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
        const actorId = authUser!.id;
        const inv = (db.inviteCodes || []).find((i) => i.id === payload.inviteId);
        const role = getUserRoleInCommunity(actorId, inv?.communityId || payload.communityId || 'comm_devforge');
        if (!['platform_admin', 'community_owner', 'admin'].includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only community owners or admins can revoke invite codes' },
            { status: 403 }
          );
        }
        result = dbOperations.revokeInviteCode(payload.inviteId);
        break;
      }

      case 'redeem_invite_code': {
        const userId = authUser!.id;
        const normalizedCode = String(payload.code || '').trim().toUpperCase();
        const inv = (db.inviteCodes || []).find((i) => i.code.toUpperCase() === normalizedCode);
        if (inv) {
          if (isUserSuspendedInCommunity(userId, inv.communityId)) {
            return NextResponse.json(
              { success: false, error: 'Your membership in this community is currently suspended.' },
              { status: 403 }
            );
          }
          const alreadyMember = db.memberships?.some((m) => m.communityId === inv.communityId && m.userId === userId);
          if (!alreadyMember) {
            const limitCheck = verifyCommunityEntitlement(inv.communityId, 'member_limit');
            if (!limitCheck.allowed) {
              return NextResponse.json(
                {
                  success: false,
                  error: limitCheck.reason,
                  upgradeUrl: limitCheck.upgradeUrl
                },
                { status: 403 }
              );
            }
          }
        }
        const redeemed = dbOperations.redeemInviteCode(String(payload.code || ''), userId);
        if (!redeemed.success) {
          return NextResponse.json(
            { success: false, error: redeemed.error || 'Failed to redeem invite code' },
            { status: 400 }
          );
        }
        result = redeemed;
        break;
      }

      case 'moderate_member': {
        const actorId = authUser!.id;
        const commId = payload.communityId || 'comm_devforge';
        const role = getUserRoleInCommunity(actorId, commId);
        if (!['platform_admin', 'community_owner', 'admin', 'moderator'].includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: moderation requires admin or moderator role' },
            { status: 403 }
          );
        }
        const modAction = payload.modAction || payload.moderationAction || payload.actionType || payload.decision;
        if (!payload.targetUserId || !['warn', 'suspend', 'reinstate', 'remove'].includes(modAction)) {
          return NextResponse.json(
            {
              success: false,
              error: 'Valid targetUserId and moderation action (warn|suspend|reinstate|remove) are required'
            },
            { status: 400 }
          );
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
        const actorId = authUser!.id;
        const commId = payload.communityId || 'comm_devforge';
        const role = getUserRoleInCommunity(actorId, commId);
        if (!['platform_admin', 'community_owner', 'admin', 'task_manager', 'moderator'].includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only community staff or task managers can create direct tasks' },
            { status: 403 }
          );
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
        const userId = authUser!.id;
        const taskForCheck = db.tasks.find((t) => t.id === payload.taskId);
        if (taskForCheck && isUserSuspendedInCommunity(userId, taskForCheck.communityId)) {
          return NextResponse.json(
            { success: false, error: 'Suspended members cannot claim tasks in this community.' },
            { status: 403 }
          );
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
        const actorId = authUser!.id;
        const offer = db.offers.find((o) => o.id === payload.offerId);
        if (!offer) {
          return NextResponse.json({ success: false, error: 'Offer not found' }, { status: 404 });
        }
        const role = getUserRoleInCommunity(actorId, offer.communityId);
        if (!['platform_admin', 'community_owner', 'admin', 'task_manager'].includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only community owners or managers can decline offers' },
            { status: 403 }
          );
        }
        result = dbOperations.declineOffer(payload.offerId, actorId, payload.reason);
        break;
      }

      case 'create_event': {
        const actorId = authUser!.id;
        const commId = payload.communityId || 'comm_devforge';
        const role = getUserRoleInCommunity(actorId, commId);
        if (!['platform_admin', 'community_owner', 'admin', 'event_organizer', 'moderator'].includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only organizers or admins can create events' },
            { status: 403 }
          );
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
        const userId = authUser!.id;
        const evtForCheck = db.events.find((e) => e.id === payload.eventId);
        if (!evtForCheck) {
          return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
        }
        if (isUserSuspendedInCommunity(userId, evtForCheck.communityId)) {
          return NextResponse.json(
            { success: false, error: 'Suspended members cannot RSVP to community events.' },
            { status: 403 }
          );
        }
        result = dbOperations.rsvpEvent(payload.eventId, userId);
        break;
      }

      case 'confirm_event_attendance': {
        const actorId = authUser!.id;
        const evt = db.events.find((e) => e.id === payload.eventId);
        const role = getUserRoleInCommunity(actorId, evt?.communityId || payload.communityId || 'comm_devforge');
        if (!['platform_admin', 'community_owner', 'admin', 'event_organizer', 'moderator'].includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: only event organizers or admins can confirm attendance' },
            { status: 403 }
          );
        }
        result = dbOperations.confirmEventAttendance(payload.eventId, payload.userId, actorId, payload.evidenceNote);
        break;
      }

      case 'endorse_member_skill': {
        const actorId = authUser!.id;
        if (actorId === payload.targetUserId) {
          return NextResponse.json({ success: false, error: 'You cannot endorse your own skill' }, { status: 400 });
        }
        result = dbOperations.endorseMemberSkill(payload.targetUserId, payload.skillName, actorId, payload.communityId);
        break;
      }

      case 'mark_notification_read': {
        const notifId = payload.notificationId || payload.notifId;
        const notif = db.notifications.find((n) => n.id === notifId);
        if (notif && notif.userId !== authUser!.id && authUser!.platformRole !== 'platform_admin') {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: cannot mark another user notification read' },
            { status: 403 }
          );
        }
        result = dbOperations.markNotificationRead(notifId);
        break;
      }

      case 'mark_all_notifications_read': {
        result = dbOperations.markAllNotificationsRead(authUser!.id);
        break;
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }

    await persistDatabaseNow(env);
    return NextResponse.json({ success: true, result, item: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
