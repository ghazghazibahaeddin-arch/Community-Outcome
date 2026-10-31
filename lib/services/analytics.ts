// Community OS — Real Outcome Analytics Engine
import { getDatabase } from '../db/store';

export interface CommunityOutcomeAnalytics {
  totalRequests: number;
  requestsWithOffers: number;
  offersAccepted: number;
  tasksAssigned: number;
  tasksCompleted: number;
  verifiedOutcomes: number;
  disputedRecords: number;
  uniqueContributors: number;
  reviewBacklog: number;
  firstMeaningfulActionsCount: number;
  avgHoursToFirstOffer: number;
  avgHoursToTaskCompletion: number;
  categoryBreakdown: { categoryId: string; name: string; count: number }[];
  linkTotals: {
    visits: number;
    starts: number;
    submissions: number;
    completions: number;
    verifiedOutcomes: number;
  };
  eventAttendanceRate: number;
}

export function computeCommunityAnalytics(communityId: string): CommunityOutcomeAnalytics {
  const db = getDatabase();
  const isAll = !communityId || communityId === 'all';

  const requests = isAll ? db.requests : db.requests.filter(r => r.communityId === communityId);
  const offers = isAll ? db.offers : db.offers.filter(o => o.communityId === communityId);
  const tasks = isAll ? db.tasks : db.tasks.filter(t => t.communityId === communityId);
  const contributions = isAll ? db.contributions : db.contributions.filter(c => c.communityId === communityId);
  const outcomes = isAll ? db.outcomes : db.outcomes.filter(o => o.communityId === communityId);
  const disputes = isAll ? db.disputes : db.disputes.filter(d => d.communityId === communityId);
  const memberships = isAll ? db.memberships : db.memberships.filter(m => m.communityId === communityId);
  const links = isAll ? db.links : db.links.filter(l => l.communityId === communityId);
  const events = isAll ? db.events : db.events.filter(e => e.communityId === communityId);

  // 1. Requests metrics
  const totalRequests = requests.length;
  const requestIdsWithOffers = new Set(offers.map(o => o.requestId));
  const requestsWithOffers = requests.filter(r => requestIdsWithOffers.has(r.id)).length;
  const offersAccepted = offers.filter(o => o.status === 'accepted').length;

  // 2. Tasks metrics
  const tasksAssigned = tasks.filter(t => Boolean(t.assigneeId)).length;
  const tasksCompleted = tasks.filter(t => t.status === 'completed').length;

  // 3. Outcomes & Verification
  const verifiedOutcomes = outcomes.filter(o => o.confirmationStatus === 'verified').length;
  const disputedRecords = disputes.length + contributions.filter(c => c.reviewStatus === 'disputed').length;

  // 4. Contributors & Onboarding
  const contributorIds = new Set<string>();
  contributions.forEach(c => contributorIds.add(c.memberId));
  tasks.forEach(t => { if (t.assigneeId) contributorIds.add(t.assigneeId); });
  const uniqueContributors = contributorIds.size;

  const firstMeaningfulActionsCount = memberships.filter(m => Boolean(m.firstMeaningfulActionAt)).length;
  const reviewBacklog = contributions.filter(c => c.reviewStatus === 'pending').length;

  // 5. Response Time Calculations (in hours)
  let totalOfferResponseHours = 0;
  let offerCalculatedCount = 0;
  requests.forEach(req => {
    const firstOffer = offers
      .filter(o => o.requestId === req.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
    if (firstOffer) {
      const diffMs = new Date(firstOffer.createdAt).getTime() - new Date(req.createdAt).getTime();
      if (diffMs > 0) {
        totalOfferResponseHours += diffMs / (1000 * 60 * 60);
        offerCalculatedCount += 1;
      }
    }
  });
  const avgHoursToFirstOffer = offerCalculatedCount > 0
    ? Math.round((totalOfferResponseHours / offerCalculatedCount) * 10) / 10
    : 0;

  // 6. Task completion durations
  let totalTaskHours = 0;
  let taskCalculatedCount = 0;
  tasks.filter(t => t.status === 'completed').forEach(task => {
    // Find contribution or updated time
    const relatedContrib = contributions.find(c => c.relatedTaskId === task.id);
    if (relatedContrib) {
      const diffMs = new Date(relatedContrib.submissionDate).getTime() - new Date(task.createdAt).getTime();
      if (diffMs > 0) {
        totalTaskHours += diffMs / (1000 * 60 * 60);
        taskCalculatedCount += 1;
      }
    }
  });
  const avgHoursToTaskCompletion = taskCalculatedCount > 0
    ? Math.round((totalTaskHours / taskCalculatedCount) * 10) / 10
    : 0;

  // 7. Category breakdown
  const categoryMap: Record<string, number> = {};
  contributions.forEach(c => {
    categoryMap[c.categoryId] = (categoryMap[c.categoryId] || 0) + 1;
  });
  const community = db.communities.find(c => c.id === communityId);
  const categoryBreakdown = Object.entries(categoryMap).map(([catId, count]) => {
    const def = community?.contributionCategories.find(c => c.id === catId);
    return {
      categoryId: catId,
      name: def?.name || catId,
      count
    };
  });

  // 8. Link aggregation
  const linkTotals = links.reduce(
    (acc, curr) => ({
      visits: acc.visits + curr.stats.visits,
      starts: acc.starts + curr.stats.starts,
      submissions: acc.submissions + curr.stats.submissions,
      completions: acc.completions + curr.stats.completions,
      verifiedOutcomes: acc.verifiedOutcomes + curr.stats.verifiedOutcomes
    }),
    { visits: 0, starts: 0, submissions: 0, completions: 0, verifiedOutcomes: 0 }
  );

  // 9. Event RSVP to Attendance conversion
  let totalRsvps = 0;
  let totalConfirmed = 0;
  events.forEach(evt => {
    totalRsvps += evt.rsvps.length;
    totalConfirmed += evt.confirmedAttendees.length;
  });
  const eventAttendanceRate = totalRsvps > 0 ? Math.round((totalConfirmed / totalRsvps) * 100) : 0;

  return {
    totalRequests,
    requestsWithOffers,
    offersAccepted,
    tasksAssigned,
    tasksCompleted,
    verifiedOutcomes,
    disputedRecords,
    uniqueContributors,
    reviewBacklog,
    firstMeaningfulActionsCount,
    avgHoursToFirstOffer,
    avgHoursToTaskCompletion,
    categoryBreakdown,
    linkTotals,
    eventAttendanceRate
  };
}
