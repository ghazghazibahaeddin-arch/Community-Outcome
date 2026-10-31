# COMMUNITY OS — MASTER PRODUCT BUILD SPECIFICATION
## Complete Multi-Community Operating System for Discord and Telegram

# 0. PRIMARY DIRECTIVE

Build a complete, production-oriented SaaS platform called **Community OS**, also known as Community Outcome OS.

This is a standalone, cross-platform operating system for online communities, starting with:

1. Discord communities and servers.
2. Telegram groups and channels.
3. A shared web platform accessible through ordinary browsers.
4. A universal Community Link System connecting the platform to both messaging ecosystems.

The platform must serve BOTH community owners and ordinary members.

It is not a replacement for Discord or Telegram. It operates on top of them, providing structured workflows, requests, offers, tasks, contribution records, trust, knowledge, onboarding, community operations, and measurable outcomes.

The central product promise is:

**Turn community conversations into organized actions, actions into completed work, completed work into verified outcomes, and verified outcomes into useful records that benefit both community owners and members.**

This is a complete product specification, not merely an MVP proposal.

Implement all the product modules defined below. Development must happen in controlled stages, but do not silently omit features or declare the project complete after building only the first stage.

---

# 1. CRITICAL IMPLEMENTATION RULES

These requirements are mandatory.

### 1.1 Build a real application

- Build actual frontend pages, backend services, database models, API endpoints, permissions and workflows.
- Do not create a static prototype.
- Do not create buttons that have no meaningful action.
- Do not substitute mock data for actual persistence.
- Do not claim that an external integration is working when it is not.
- Do not present incomplete functionality as completed.
- Do not fabricate analytics, user counts, achievements, activity, bot status or verification results.

### 1.2 Preserve independent feature concepts

Some product features use similar data but solve different problems.

Keep them as distinct product modules with their own purposes, interfaces, states and acceptance criteria.

Do not silently combine:

- Member Profile and Member Passport.
- Member Passport and Portable Trust Profile.
- Contribution Ledger and Outcome Portfolio.
- Portable Contribution Card and Portable Outcome Record.
- Request Status Tracking and Execution Checklist.
- Evidence Submission and Contribution Approval.
- RSVP Registration and Attendance Confirmation.
- Community Knowledge Publisher and Trusted Source Cards.
- Community Inbox and Community Opportunity Feed.
- Community Link Manager and Community Action Hub.
- Poll2Plan and Task Management.
- TrustGraph and general member ratings.
- GuildTest and general application tests.

Shared backend services are permitted, but distinct product capabilities must remain distinct.

### 1.3 Data integrity

Never use invented production numbers.

Every actual metric must come from persisted records or a verified external source.

Distinguish test data from real data.

When no data exists, show a genuine empty state or an accurate zero.

Never report a button click as a successful outcome, an unverified claim as a verified contribution, or a configured token as a connected bot.

### 1.4 Controlled development

Build the project through stable development phases.

At the end of each phase:

1. Run the applicable type checks.
2. Run the relevant tests.
3. Run the build.
4. Fix discovered root causes.
5. Verify previously working functionality.
6. Create a stable checkpoint where the environment supports it.

Do not repeatedly rewrite stable files.

Do not enter infinite Fix Problem cycles.

Do not add unrelated features while resolving a blocking defect.

Do not globally disable validation or suppress errors to make a build pass.

Do not stop after writing a plan. Continue implementing all phases within the available environment without asking for unnecessary approvals.

If an external capability is unavailable, build the correctly structured integration and identify the exact remaining requirement honestly.

---

# 2. PRODUCT ARCHITECTURE

Use a clear, scalable architecture.

### Preferred technology stack

- Frontend: Next.js App Router and TypeScript.
- Backend: NestJS and TypeScript.
- Database: PostgreSQL.
- ORM: Prisma ORM, using a compatible stable version.
- UI: Tailwind CSS and shadcn/ui.
- Background processing: Redis and BullMQ when genuinely needed.
- File storage: S3-compatible storage.
- Discord integration: discord.js or an appropriate official Discord API architecture.
- Telegram integration: grammY or an appropriate official Telegram Bot API architecture.
- Repository: pnpm workspaces monorepo.

Before implementation, verify the development environment's actual capabilities.

If Google AI Studio requires a different compatible application structure, use its supported environment without introducing an incompatible architecture. Preserve clear frontend, backend and domain boundaries.

Do not switch frameworks halfway through the build.

### Architectural principle

Use a modular monolith initially, not unnecessary microservices.

The platform backend is the single source of truth.

Discord and Telegram must be adapters connected to the same application services and database.

The browser, Discord bot, Telegram bot and supported Telegram Mini Apps must never maintain competing versions of the same community business logic.

### Main backend modules

Create clear domain modules for:

- Authentication and Identity.
- Users and Member Profiles.
- Member Passport.
- Communities and Memberships.
- Roles and Permissions.
- Community Onboarding.
- NeedSignal.
- Match & Offer.
- Expert Exchange.
- Poll2Plan.
- Tasks and QuestLoop.
- Commitments and PromiseGraph.
- Contributions and Contribution Taxonomy.
- TrustGraph.
- Disputes and Community Shield.
- Portable Records.
- Community Links.
- Community Action Network.
- Community Knowledge.
- SourceTrail.
- Community Outcome Analytics.
- Member Recovery.
- GuildGrowth.
- Community Agent Kits.
- Community Inbox.
- Personal Opportunity Feed.
- Outcome Portfolio.
- Notifications.
- Discord Adapter.
- Telegram Adapter.
- BotRelay.
- Mini App Compatibility and Testing.
- Audit Logs.
- Integration Health.

---

# 3. USERS, ROLES AND MULTI-COMMUNITY IDENTITY

Support the following roles:

### Platform-level roles

- Platform Administrator.
- Support Operator, with restricted support permissions.

### Community-level roles

- Community Owner.
- Administrator.
- Moderator.
- Reviewer or Verifier.
- Event Organizer.
- Task Manager.
- Expert or Service Provider.
- Regular Member.
- Guest or Visitor.

Permissions must be granular and configurable by the community owner.

A user may belong to multiple communities and have different roles in each.

A member who is a moderator in one community must not automatically become a moderator in another.

Implement:

- Secure authentication.
- Account registration.
- Login and logout.
- Session management.
- Account recovery where supported.
- Profile management.
- Role management.
- Membership invitations.
- Account linking.
- Member consent.
- Audit history.
- Account deletion and privacy controls.

### Platform identity linking

Support verified connections between:

- Community OS accounts.
- Discord user IDs.
- Telegram user IDs.

Use short-lived, single-use verification challenges or appropriate OAuth/platform verification methods.

Never match accounts based only on usernames or display names.

Support unlinking, revocation and reconnection.

---

# 4. COMMUNITY MANAGEMENT CORE

Implement complete multi-tenant community management.

Each community must have:

- Name and description.
- Category or community type.
- Avatar and cover image.
- Owner and administrators.
- Members and roles.
- Community rules.
- Default privacy settings.
- Allowed workflows.
- Contribution categories.
- Review and approval rules.
- Connected Discord servers.
- Connected Telegram groups or channels.
- Community Action Hub.
- Community Links.
- Community Knowledge.
- Dashboard and analytics.
- Activity and audit history.

Support multiple communities under one member account.

Support multiple authorized platform connections where appropriate.

Every private record must be associated with the correct community.

Implement strict tenant isolation.

---

# 5. CORE SHARED WORKFLOW MODULES

## 5.1 NeedSignal — Structured Community Needs and Requests

Turn unstructured requests into organized records.

Allow members to create a request containing:

- Title.
- Description.
- Category.
- Type of assistance needed.
- Required skills.
- Priority.
- Expected result.
- Deadline.
- Supporting links or files.
- Community.
- Visibility.
- Required permissions.
- Optional location or availability constraints.
- Request source.
- Request owner.

Support request states such as:

- Draft.
- Open.
- Needs clarification.
- Receiving offers.
- Matched.
- Assigned.
- In progress.
- Waiting for information.
- Completed.
- Closed.
- Cancelled.
- Disputed.

Provide a structured request page and a short public request form through a Community Link.

## 5.2 Match & Offer — Matching Needs with Skills and Offers

Allow members and experts to respond to requests.

An offer can include:

- Proposed help.
- Relevant skills.
- Experience description.
- Availability.
- Estimated time.
- Proposed approach.
- Supporting portfolio links.
- Conditions and constraints.

The matching system may suggest appropriate offers based on skills, categories, availability and stated requirements.

Do not automatically select an offer without permission.

The requester or authorized manager makes the final decision.

Track offer status and decision history.

Prevent duplicate and unauthorized offers.

## 5.3 Community Expert Exchange

Create a searchable, optional directory of community experts and service providers.

Members can:

- Create an expertise profile.
- Declare skills and experience.
- Indicate available times.
- Define assistance categories.
- Receive relevant help requests.
- Offer a session or consultation.
- Book an appointment where the community allows it.
- Link the engagement to an outcome record.

Distinguish self-declared skills from independently verified results.

Do not build payments or paid booking workflows.

## 5.4 Poll2Plan — Turn Community Decisions into Action Plans

Implement this as a separate feature, not as an ordinary task list.

Allow communities to:

1. Create a decision question.
2. Define alternatives.
3. Collect authorized votes or preferences.
4. Show the actual results.
5. Record the decision and its approval context.
6. Convert the selected result into an execution plan.
7. Assign responsibilities.
8. Define deadlines.
9. Create tasks and checklists.
10. Track completion against the original decision.

The plan must preserve its source poll or decision.

A vote or expression of interest must not automatically be treated as a binding commitment.

## 5.5 Shareable Execution Plans

Allow organizers to create a plan with:

- Agreed outcome.
- Tasks.
- Owners.
- Participants.
- Deadlines.
- Checklists.
- Attendance or booking status where applicable.
- Progress updates.
- Completion confirmations.

Generate a controlled sharing link so participants can see the relevant plan and perform authorized actions.

## 5.6 QuestLoop — Community Tasks and Bounties

Provide a structured system for challenges and contribution opportunities.

Each task includes:

- Description.
- Expected output.
- Acceptance criteria.
- Responsible person.
- Participants.
- Deadline.
- Status.
- Checklist.
- Evidence requirements.
- Review process.
- Non-monetary recognition or reward where configured.

Support task assignment, progress tracking, completion requests, review and result recording.

Do not implement monetary bounties, payment processing or cash rewards.

---

# 6. COMMITMENTS, RESPONSIBILITY AND TASK HANDOFF

## 6.1 Member Commitment Ledger — PromiseGraph

This must be separate from the ordinary task list and Contribution Ledger.

Record explicit commitments between members or between members and organizers.

Each commitment must preserve:

- What was agreed.
- Who committed.
- Who is expecting delivery.
- Related request or decision.
- Responsible person.
- Original deadline.
- Changes to the deadline.
- Current status.
- Completion confirmation.
- Any disagreement.
- Full change history.

Do not infer commitments from casual discussion or a simple reaction.

## 6.2 MoveSure — Task Handoffs

Provide a structured task handoff feature.

When work moves from one member or team to another:

- Record the previous owner.
- Record the next owner.
- Transfer relevant context.
- Transfer evidence and outstanding items.
- Confirm acceptance of the handoff.
- Record the time and reason.
- Retain the previous responsibility history.

Prevent context and accountability from being silently lost.

## 6.3 IntentReady — Intent to Action

Allow a member to turn interest into an explicit action.

Examples:

- Interested in attending an event.
- Wants to help with a project.
- Wants to learn a skill.
- Wants to volunteer.
- Wants to participate in a challenge.

Record the exact action the member intends to take, its status and the relevant deadline or responsible party when appropriate.

Distinguish interest from a confirmed commitment.

---

# 7. CONTRIBUTION LEDGER AND TRUST SYSTEM

## 7.1 Contribution Ledger

Create a complete record of meaningful member contributions.

Each record must contain:

- Contribution ID.
- Member.
- Community.
- Contribution type.
- Related request, task, event or project.
- Description.
- Source.
- Supporting evidence.
- Submission date.
- Reviewer.
- Review status.
- Decision reason.
- Confirmation history.
- Dispute history.
- Sharing permissions.

Keep the Contribution Ledger separate from profile skills and general activity history.

## 7.2 Contribution Taxonomy — MOD-1

Allow each community to define its own contribution categories and rules.

Examples:

- Technical assistance.
- Mentoring.
- Task completion.
- Moderation.
- Documentation.
- Event organization.
- Knowledge sharing.
- Community building.
- Expert sessions.
- Project delivery.

Each category must have transparent definitions and review requirements.

Do not apply one universal contribution ranking model to every community.

## 7.3 Contribution Ranking — Link-1

Provide a community-configurable contribution ranking.

The ranking must:

- Use defined contribution categories.
- Use transparent rules.
- Distinguish verified from unverified records.
- Explain why an item or contribution is ranked.
- Avoid double counting.
- Permit correction and appeal.
- Avoid turning community reputation into one opaque global score.

Support separate ranking views for different types of contribution.

## 7.4 TrustGraph — Mutual Outcome Verification

Implement a trustworthy result-confirmation process.

The workflow must distinguish:

- Work submitted as complete.
- First-party confirmation.
- Second-party confirmation.
- Supporting evidence.
- Independent reviewer confirmation.
- Dispute.
- Unresolved outcome.
- Corrected outcome.

Silence must never automatically count as confirmation.

A user cannot make a contribution verified merely by self-submitting it.

Store the source and authority of every confirmation.

## 7.5 MOD-3 — Mutual Outcome Attestation

Create a separate mutual confirmation mechanism for agreements and outcomes.

Record:

- What each party agreed would be delivered.
- What the first party confirms.
- What the second party confirms.
- Whether their confirmations agree.
- Supporting evidence.
- The reason for any disagreement.
- The final resolution.

A completed claim with an unresolved disagreement must remain clearly disputed or unresolved.

## 7.6 Contribution Approval Workflow — ALT-8 and Link-8

Implement configurable reviewer roles.

Provide:

- Approval.
- Rejection with an explanation.
- Request for more evidence.
- Correction.
- Appeal.
- Conflict-of-interest disclosure.
- Review history.
- Reviewer identity.
- Timestamped audit entries.

Separate the evidence-submission step from the decision-making step.

## 7.7 Community Shield — Disputes and Fairness

Create a dedicated dispute center.

Members can:

- Challenge a decision.
- Provide additional evidence.
- Explain disagreement.
- Request correction.
- Appeal where allowed.
- Track their dispute.

Reviewers can:

- Investigate.
- Request further evidence.
- Record a decision.
- Explain the decision.
- Assign an independent reviewer if required.

Do not allow community administrators to silently erase or rewrite verified history.

Keep an immutable or tamper-evident audit history for consequential trust decisions.

## 7.8 MOD-7 — Community Trust Sources

Every trust assertion must identify:

- Who confirmed it.
- Their relationship to the result.
- What exactly they confirmed.
- When they confirmed it.
- What evidence was used.
- Whether the confirmation remains valid.
- Whether sharing is still authorized.

Avoid misleading universal trust guarantees.

---

# 8. PORTABLE IDENTITY, CONTRIBUTIONS AND OUTCOMES

Keep the following features distinct.

## 8.1 Member Profile

The member's ordinary account and profile information.

## 8.2 Member Passport

A controlled personal profile containing:

- Display name.
- Biography.
- Skills.
- Interests.
- Languages.
- Expertise.
- Collaboration preferences.
- Selected portfolio links.
- Public visibility settings.

Clearly identify self-declared skills and independently verified evidence.

## 8.3 Portable Trust Profile — User-2

A member-controlled profile of selected verified contributions and outcomes across communities.

It must distinguish:

- Self-declared information.
- Evidence-supported claims.
- Verified contributions.
- Disputed or unresolved records.

The member chooses what to share.

Do not move private conversations or unrelated community data between communities.

## 8.4 Portable Contribution Card — ALT-5 and Link-5

A portable card for one specific contribution.

It must show:

- Contribution description.
- Source community.
- Relevant task or request.
- Verification status.
- Reviewer or confirmation authority where shareable.
- Evidence reference where permission allows.
- Date.
- Sharing validity.

The card must not reveal the member's entire history.

## 8.5 Portable Outcome Record — ALT-4

A different object from an individual contribution card.

It records a shared result, project or service outcome, including:

- Agreed objective.
- Participating parties.
- Delivered result.
- Confirmation status.
- Evidence.
- Source community.
- Date.
- Dispute status.
- Sharing permissions.

## 8.6 Outcome Portfolio — User-5

A member-controlled portfolio of selected outcomes from multiple communities.

Allow members to organize and share selected outcomes for work, collaboration, volunteering or professional opportunities.

## 8.7 Privacy and Consent Controls — User-4

Members must control:

- Which records they share.
- Which fields are visible.
- Which recipients can access them.
- Whether access is public or community-specific.
- Whether links expire.
- Whether sharing can be revoked.
- Whether identity links remain connected.
- Whether portfolio information can appear in discovery.

Revocation must prevent future access where technically possible.

Document that previously exported copies cannot necessarily be recalled.

---

# 9. MEMBER-CENTERED SERVICES

## 9.1 Community Inbox — User-1

Create a unified member inbox across the communities the member chooses to connect.

Include:

- Requests the member created.
- Requests they responded to.
- Offers they submitted.
- Tasks they accepted.
- Plans they participate in.
- Pending commitments.
- Contributions awaiting review.
- Notifications concerning verified outcomes.
- Events requiring attention.
- Dispute and appeal updates.

Each item must link to its genuine source record.

Do not show private content from communities without authorization.

## 9.2 Personal Need & Opportunity Feed — User-3

Create an optional personalized feed of:

- Relevant requests.
- Expert opportunities.
- Tasks.
- Community activities.
- Events.
- Mentoring requests.
- Skill-sharing opportunities.

Matching can use declared skills, interests, availability and selected conditions.

The member must choose which communities and types of notifications to receive.

Do not automatically publish personal data or broadcast requests across communities.

## 9.3 Community Onboarding — Group Activation and MOD-5

Create role-specific onboarding journeys.

Separate journeys may exist for:

- New member.
- Moderator.
- Community owner.
- Expert.
- Volunteer.
- Event organizer.
- Task participant.

The onboarding path should present only relevant steps and resources.

Record the member's first meaningful action, not merely the act of opening a welcome message.

## 9.4 Member Matching

Allow members to find potential collaborators based on declared skills, interests and collaboration preferences.

Offer suggested connections with clear reasons.

Do not make sensitive characteristics or private activity the basis of undisclosed matching.

---

# 10. COMMUNITY KNOWLEDGE AND SOURCE MANAGEMENT

## 10.1 Community Knowledge Publisher — Owner-2

Allow authorized moderators to convert selected useful community information into structured knowledge pages.

Each knowledge item must have:

- Title.
- Content.
- Category.
- Owner.
- Source.
- Author.
- Date created.
- Last reviewed date.
- Version history.
- Visibility.
- Review status.
- Related community.

The moderator explicitly selects material for publication.

Do not automatically scrape or publish private conversations.

## 10.2 SourceTrail — Decision and Information Provenance

Create a separate source-record feature for important information and decisions.

Link a decision to:

- Its source documents.
- Relevant links.
- Supporting evidence.
- Responsible person.
- Decision date.
- Assumptions.
- Review status.
- Subsequent revisions.

A reader must be able to understand why a decision was made.

## 10.3 MOD-4 — Knowledge Freshness

Monitor knowledge records with scheduled review dates.

Allow moderators to receive notices when:

- A review date arrives.
- A source becomes unavailable.
- A source is updated where such change detection is available.
- A policy is superseded.
- An item is disputed or outdated.

Keep old versions available where appropriate and mark superseded knowledge clearly.

Do not claim an external source has changed unless the system actually detected that change.

## 10.4 Link-16 — Trusted Source Card

Implement an independently shareable card attached to a specific answer, recommendation or factual claim.

Include:

- The answer or recommendation.
- The source.
- Context.
- Review date.
- Reviewer.
- Scope of validity.
- Evidence links.
- Known uncertainty.
- Disputed or superseded status.

This is different from a generic knowledge page.

## 10.5 ALT-10 — Evidence-Aware Recommendation Card

Allow users to share a recommendation with its evidence and context.

Distinguish:

- Personal experience.
- Community recommendation.
- Source-supported claim.
- Independently verified result.

Do not present a personal opinion as a guaranteed or independently verified fact.

---

# 11. COMMUNITY LINK SYSTEM — FULL IMPLEMENTATION

Community Links are a central product feature, not an ordinary link directory.

Every link must support a real user action or a meaningful view.

Build a dedicated Community Link Manager and an underlying reusable link engine.

## 11.1 Main Community Link Hub

Create a multipurpose Community Hub Link.

When opened, it should identify the intended community and present appropriate actions according to the visitor's role and permissions.

Members may see:

- Request help.
- Offer a skill.
- View tasks.
- Submit a contribution.
- Follow a task.
- View events.
- View authorized knowledge.
- Access their Member Space.

Owners and moderators may see authorized administrative options.

Do not expose admin functionality to visitors.

## 11.2 Preserve Every Link Concept Separately

Implement these independent concepts:

**Link-1 — Valuable Contribution Ranking**

A link or page for viewing the community's configured contribution categories and rankings.

**Link-2 — Contributor Tipping**

Explicitly excluded from this build because monetary and payment functionality is out of scope. Do not build a tipping interface, payment form or financial transaction logic.

**Link-3 — Contribution-Linked Thanks**

Allow members to thank someone for a specific contribution. Store the thank-you in relation to the relevant contribution, without cash transfers.

**Link-4 — Confirmable Contribution Record**

Create a contribution record that can be confirmed by an authorized recipient or reviewer, with evidence and dispute status.

**Link-5 — Portable Contributor Card**

Generate a member-controlled card for sharing an individual contribution between communities.

**Link-6 — Owner Dashboard Link**

Provide an authorized owner-facing link that can open relevant community administration and link analytics according to permissions.

**Link-7 — Community Bounties**

Create structured contribution opportunities with deliverables, eligibility, deadlines and review criteria.

Use non-monetary rewards or recognition only.

**Link-8 — Approval and Dispute Rules**

Provide transparent approval rules, reviewer permissions and an appeal path.

**Link-09 — Short Help Request Form**

Allow a visitor or member to submit a structured request through one link.

**Link-10 — Skill or Service Offer Card**

Allow a member to present a skill or offer help through a dedicated link.

**Link-11 — Lightweight Appointment Booking**

Allow a member to share available time slots for a consultation or help session. This is scheduling only, not payment processing.

**Link-12 — Community Event RSVP**

Allow members to register their intention to attend an event and manage their attendance response.

**Link-13 — Execution Checklist**

Provide a trackable checklist through one link for participants in a task or plan.

**Link-14 — Contribution Evidence Submission**

Allow a member to upload or link evidence for a specific contribution record.

**Link-15 — Contribution Decision**

Provide a review link for an authorized reviewer to approve, reject with reasons or request corrections.

This must remain distinct from Link-14.

**Link-16 — Trusted Knowledge Source Card**

Provide a link to an answer or recommendation that preserves its sources, date and review status.

**Link-17 — Role-Based Onboarding Link**

Ask the visitor what role or purpose they have and show the appropriate path, such as member, expert, volunteer or moderator.

**Link-18 — Task or Bounty Card**

Show requirements, acceptance criteria, deadline, eligible participants and non-monetary recognition.

No monetary rewards or payment functionality.

**Link-19 — Manual Request Status Update**

Provide a simple unified status page for a request, including:

- New.
- Needs information.
- Accepted.
- In progress.
- Completed.
- Paused.
- Closed.

Record update reason and last update.

This is not the same as a multi-step execution checklist.

**Link-20 — Multi-Community Help Request**

Allow the request owner to choose specific communities in which the request may be shared.

Only publish the explicitly authorized fields.

Keep the source request and its history linked.

**Link-21 — Attendance or Activity Confirmation**

After an event or task, request a separate confirmation of actual participation or execution.

Distinguish self-report from independent evidence.

Do not treat RSVP as proof of attendance.

**Link-22 — Single Contribution Public Card**

Create a shareable public card for one authorized contribution, not the entire contributor profile.

**Link-23 — Referral Attribution**

Provide optional referral source codes and aggregate attribution reports.

Respect privacy and never expose individual browsing histories without consent.

**Link-24 — Issue Reporting**

Allow users to report a problem involving a resource, event, community service or task and follow its status.

**Link-25 — Link Audience and Expiration**

Provide access restrictions, expiration, revocation and replacement.

**Link-26 — Owner Outcome Report**

Provide a concise report of actual actions and results generated through a specific link.

## 11.3 Additional Link Features

Implement:

- Secure random link tokens.
- Public, login-required, member-only and role-restricted links.
- Expiry and revocation.
- One-time links where appropriate.
- Usage limits where appropriate.
- Link attribution.
- Destination customization.
- QR code generation where supported.
- Copy and sharing controls.
- Expiration warnings.
- Abuse protection.
- Link ownership and audit history.

Track visits, starts, submissions, accepted actions, completion and verified outcomes separately.

Never treat link visits as completed results.

## 11.4 Cross-Platform Community Action Link — VAR-9

Create platform-neutral action URLs.

The same underlying request, task, plan or contribution can be accessed through a link shared in Discord, Telegram or an ordinary browser.

The platform presentation may vary based on the source channel, but the underlying record and permissions must remain the same.

Do not assume permissions from the originating messaging platform that the platform does not actually provide.

## 11.5 Community Link as Multipurpose Member-and-Admin Link — ALT-6

One community link may serve multiple audiences.

After identifying the user's role and intended action, route the user to the correct experience:

- Member actions.
- Expert actions.
- New-member onboarding.
- Request and offer forms.
- Task tracking.
- Contribution submission.
- Contribution review.
- Owner dashboard where authorized.

The link must not expose every action to every visitor.

---

# 12. CROSS-COMMUNITY NETWORK AND PORTABLE OPERATIONS

## 12.1 Community Action Network — ALT-2

Build a shared network of structured community actions.

Connect:

- Needs.
- Offers.
- Decisions.
- Plans.
- Tasks.
- Commitments.
- Evidence.
- Outcomes.

A request may originate in one community and be voluntarily shared with another.

Its state must remain traceable.

## 12.2 Demand Aggregation — VAR-1

Allow authorized and consenting communities to identify similar needs.

Aggregate only permitted, relevant information.

Show common demand without exposing private request details.

Do not merge separate requests into one record without participant consent.

## 12.3 Expert Request and Answer Network — VAR-2

Allow communities to discover relevant expertise across participating communities.

Allow a member to offer an answer, mentoring session or service.

Preserve request ownership, attribution and review history.

## 12.4 Community Demand-to-Supply Network — VAR-3

Connect community needs with available skills, services and volunteers.

Provide filters and matching suggestions.

Allow community owners to configure what can be discovered externally.

## 12.5 Community Outcome Sharing Loop — VAR-8

Provide a controlled way to publish verified and shareable outcomes.

A useful outcome page may include:

- What problem was addressed.
- What the community accomplished.
- What evidence supports it.
- Who participated, subject to consent.
- Which community or resource contributed.
- A link to the community's public landing page.
- An optional invitation to participate.

The objective is genuine organic discovery through valuable results, not forced referrals or spam.

## 12.6 MOD-6 — Cross-Community Help Tracking

Allow a member to share a request with selected communities.

Keep its source, approved audience and request history.

Allow the member to revoke future sharing where supported.

## 12.7 Cross-Community Portable Identity — VAR-7

Enable members to present selected verified records to another community.

Maintain source attribution and explicit recipient permissions.

## 12.8 MOD-8 — Shareable Owner Outcome Reports

Allow authorized owners to generate reports based on actual records.

Reports must distinguish confirmed outcomes, unresolved records and incomplete activities.

---

# 13. COMMUNITY OWNER FEATURES

## 13.1 Group Activation — Owner-1

Create a structured new-member activation journey.

It must:

- Ask only necessary onboarding questions.
- Identify a member's interests and goals.
- Recommend a relevant first activity.
- Suggest suitable people, tasks or knowledge.
- Record the first meaningful completed action.

Track onboarding stages honestly.

## 13.2 Community Knowledge Publisher — Owner-2

Provide a moderation workflow for selecting, reviewing and publishing reliable community information.

## 13.3 Community Expert Exchange — Owner-3

Provide expert discovery, service offers, help requests, booking and outcome records.

## 13.4 Community Outcome Analytics — Owner-4

Implement a real owner dashboard with:

- Help requests.
- Requests receiving offers.
- Accepted offers.
- Completed tasks.
- Verified outcomes.
- Disputed results.
- Contribution reviews.
- Participating members.
- First meaningful actions.
- Event registration and actual attendance where verifiable.
- Knowledge usage where tracking is allowed.
- Link performance.
- Referral attribution.
- Response and completion times when enough valid data exists.

Every metric requires a defined calculation.

Do not fabricate historical metrics or present insufficient data as a reliable percentage.

## 13.5 Member Recovery — Owner-6

Provide privacy-respecting signals when a member's participation appears to decrease, only using activity the application is authorized to access.

Allow the owner to offer a useful resource, invitation or support action.

Respect user notification preferences.

Measure whether the member resumed a meaningful action only when actual data confirms it.

Do not build intrusive surveillance or infer sensitive personal reasons for inactivity.

## 13.6 GuildGrowth — Owner-7

Track the relationship between invitations, onboarding, community activities and meaningful participation.

Prioritize quality of activation and verified results rather than member count alone.

Provide shareable result pages.

## 13.7 Community Agent Kits — Owner-8

Create reusable, configurable workflow templates for common community operations.

Examples:

- Welcome and onboarding.
- Assigning reviewers.
- Request triage.
- Volunteer coordination.
- Event follow-up.
- Task reminders.
- Knowledge publication review.
- Contribution review.
- Dispute routing.
- Outcome reporting.

Each workflow must include:

- Trigger.
- Required conditions.
- Allowed actions.
- Required permissions.
- Human approval steps.
- Action log.
- Failure handling.
- Disable and rollback controls.

Agents must never gain broad administrator permissions automatically.

AI-generated suggestions, where implemented, must be identified as suggestions and must respect human approval settings.

Do not create an autonomous payment or financial agent.

---

# 14. TELEGRAM-SPECIFIC COMMUNITY OS MODULES

Implement Telegram as a first-class platform adapter, not as a secondary notification-only bot.

## 14.1 TG-1 — Telegram Trust Network

Provide a consent-based, verifiable provider or community identity record connected to:

- Verified Telegram account identifier.
- Authorized bot.
- Linked group or channel where appropriate.
- Community profile.
- Declared services or expertise.
- Verified service outcomes.
- Relevant dispute and review records.
- Sharing permissions.

Do not promise that a verified Telegram identity guarantees the honesty, legality or quality of every service.

Do not include payment verification or financial transaction proof.

## 14.2 TG-2 — Telegram Community OS

Provide a central operating workspace for the Telegram communities that owners have authorized the platform to manage.

Support:

- Group and channel linking.
- Member onboarding.
- Role and permission mapping where supported.
- Welcome workflows.
- Structured requests.
- Offers and tasks.
- Events.
- Knowledge links.
- Support workflows.
- Community notifications.
- Integration health.
- Audit records.
- Reusable workflows and automation templates.

Respect Telegram's actual Bot API permissions and privacy behavior.

## 14.3 TG-3 — ChannelFlow

Allow authorized channel posts to connect with actionable workflows.

Examples:

- An announcement opens a registration link.
- An event post opens an RSVP page.
- A request post opens a help form.
- An offer post opens a service profile.
- A useful knowledge post opens a source card.

Track the originating link and subsequent permitted actions.

Do not assume the system can read all historical channel messages.

## 14.4 TG-4 — MiniApp PartnerOS

Provide an optional partner and campaign workspace for authorized Telegram Mini App developers and participating communities.

Support:

- Partner directory.
- Campaign description.
- Campaign terms.
- Partner approval.
- Referral links.
- Attribution.
- Authorized campaign events.
- Performance reporting.
- Versioned campaign records.

Do not implement commissions, payouts or payment processing.

## 14.5 TG-5 — MiniApp TrustCheck

Provide a functional test workspace for supported Telegram Mini Apps.

Track:

- App identity.
- Tested version.
- Test environment.
- Link opening.
- Authentication behavior.
- Onboarding flow.
- Main actions.
- Failure states.
- Compatibility results.
- Regression results.

A successful test report must describe what was tested.

Do not describe a tested Mini App as security-certified without an actual independent certification.

## 14.6 TG-6 — BotRelay

Implement a permission-controlled workflow event bridge for authorized bots and integrations.

Support:

- Trigger definitions.
- Event routing.
- Allowed actions.
- Execution status.
- Idempotency.
- Retry rules.
- Permission validation.
- Audit logs.
- Failure handling.

Do not allow arbitrary external bots to execute privileged operations.

## 14.7 TG-07 — Mini App Context and Permission Boundary Checker

Verify exactly what information is available when a Telegram Mini App is opened:

- Verified startup information.
- Authenticated user context.
- Approved group or chat context where actually available.
- Data that must be manually entered.
- Actions requiring an explicit bot interaction.
- Actions requiring additional permissions.

Do not assume a direct Mini App link grants access to private messages or all group details.

## 14.8 TG-08 — MiniApp TrustPass

Provide a version-specific trust and test summary.

Show:

- App version.
- Declared capabilities.
- Permissions requested.
- Tests actually completed.
- Known limitations.
- Review date.
- Relevant evidence.
- Whether the report is current or superseded.

Do not confuse the identity of a developer with the security status of an application.

---

# 15. DISCORD-SPECIFIC COMMUNITY OS MODULES

Discord must support more than basic slash commands.

## 15.1 DC-1 — GuildGrowth

Connect invitations, onboarding, activities and meaningful results.

Measure which community activities lead to actual participation rather than merely counting joins.

Enable shareable verified outcome pages.

## 15.2 DC-2 — QuestLoop

Provide a Discord-friendly community challenge and task system.

Support:

- Challenges.
- Tasks.
- Deliverables.
- Acceptance criteria.
- Responsible members.
- Deadlines.
- Participation progress.
- Evidence.
- Review.
- Completion.
- Outcome sharing.

Make progress accessible from the bot and web dashboard.

## 15.3 DC-3 — GuildTest

Implement a testing and reliability module for connected Discord server tools and bots.

Support:

- Important slash-command checks.
- Integration health checks.
- Permission changes.
- Command availability.
- Regression checks.
- Test version history.
- Error records.
- Re-testing after fixes.
- Change previews.

Where possible, simulate permission changes before applying them.

Do not make unsafe permission changes to real community servers during automated tests.

## 15.4 DC-4 — IntentReady

Convert Discord member intent into explicit, trackable actions.

Examples:

- Interested in a project.
- Interested in an event.
- Ready to volunteer.
- Wants to help with a request.
- Wants to join a challenge.

Record the chosen action and its commitment status.

## 15.5 DC-5 — GuildPass

Create a shareable achievement or participation page connected to a Discord server.

Allow members to select relevant tasks, results and approved contributions.

Display the source server and confirmation authority.

Do not expose Discord message history.

## 15.6 DC-6 — AI Builder Pass

Implement a specialized optional profile for members who build AI tools, bots or developer utilities.

It can show:

- Tool identity.
- Owner or declared creator.
- Repository or project reference.
- Tested versions.
- Actual test results.
- Known limitations.
- Community reviews.
- Verified contributions.
- Supported capabilities.

Do not claim a tool is safe or functional merely because its creator has published it.

Attach test evidence to a specific version.

## 15.7 DC-7 — GuildDrops

Implement non-monetary community reward campaigns.

Examples:

- Special community roles.
- Recognition.
- Early access.
- Event participation privileges.
- Non-financial contribution certificates.
- Challenge completion status.

Each campaign must clearly state:

- Eligibility.
- Requirements.
- Verification process.
- Reward type.
- Approval authority.
- Distribution status.
- Appeal process.

Do not include cash rewards or financial transfers.

---

# 16. UNIFIED BOT EXPERIENCE AND COMMANDS

Both bots must operate on the same central backend.

### Discord suggested commands

- `/community`
- `/hub`
- `/help-request`
- `/requests`
- `/offer-help`
- `/my-tasks`
- `/task`
- `/contributions`
- `/submit-contribution`
- `/events`
- `/poll`
- `/plan`
- `/passport`
- `/knowledge`
- `/link`
- `/status`
- `/connect-account`

### Telegram suggested commands

- `/start`
- `/help`
- `/community`
- `/hub`
- `/request`
- `/requests`
- `/offer`
- `/mytasks`
- `/task`
- `/contributions`
- `/submit`
- `/events`
- `/poll`
- `/plan`
- `/passport`
- `/knowledge`
- `/link`
- `/status`
- `/connect`

Use interactive buttons, menus and Telegram inline keyboards where appropriate.

Use the web application for long forms, detailed contribution evidence, appeals, administrative configuration and complex reports.

### Bot behavior

A bot should:

- Guide users to the correct action.
- Retrieve permitted real records.
- Accept supported structured actions.
- Send relevant notifications.
- Update the shared application state.
- Explain failures.
- Respect user and community permissions.

It must not simply send a generic link in response to every command.

---

# 17. UNIFIED NOTIFICATIONS

Build a shared notification engine.

Support:

- In-app inbox.
- Discord notifications.
- Telegram notifications.
- Notification preferences.
- Community announcement settings.
- Event reminders.
- Task reminders.
- Request updates.
- Offer decisions.
- Contribution reviews.
- Dispute decisions.
- Knowledge updates.

Use idempotent event handling.

Record:

- Notification created.
- Delivery attempted.
- Delivery succeeded.
- Delivery failed.
- Retry scheduled.
- Read status.

Do not mark an external notification as delivered without a successful platform response.

Respect opt-in, privacy and anti-spam requirements.

---

# 18. COMMUNITY TYPE TEMPLATES

Create adaptable templates without creating separate incompatible products.

Support templates for:

- Developer communities.
- Programming and open-source communities.
- AI builder communities.
- Education and learning groups.
- Volunteering communities.
- Professional networks.
- Creator communities.
- Gaming communities.
- Hobby and interest communities.
- Local communities.

Templates may configure:

- Contribution types.
- Default workflows.
- Onboarding paths.
- Common task types.
- Knowledge categories.
- Expert profiles.
- Event formats.
- Review requirements.
- Community metrics.

Every template must remain configurable.

Do not assume every type of community needs every feature.

The shared platform architecture must remain consistent.

---

# 19. OWNER WORKSPACE AND MEMBER WORKSPACE

## 19.1 Owner Workspace

Provide a centralized dashboard containing:

- Communities managed.
- Community settings.
- Members and roles.
- Connected Discord servers.
- Connected Telegram groups and channels.
- Integration health.
- Requests requiring attention.
- Offers awaiting decisions.
- Tasks requiring assignment.
- Tasks approaching deadlines.
- Contribution review queue.
- Disputes and appeals.
- Community Links.
- Community Knowledge.
- Poll2Plan decisions.
- Expert Exchange.
- Community Outcome Analytics.
- GuildGrowth.
- Community Agent Kits.
- Audit history.

The owner's interface must prioritize the next useful action rather than display decorative counters.

## 19.2 Member Workspace

Provide a unified personal workspace containing:

- My communities.
- My requests.
- My offers.
- My tasks.
- My commitments.
- My contributions.
- Pending reviews.
- My disputes and appeals.
- My Member Passport.
- My Portable Trust Profile.
- My Community Inbox.
- My Need & Opportunity Feed.
- My Outcome Portfolio.
- My shared records.
- Privacy and consent settings.
- Account-linked Discord and Telegram identities.
- Notifications.

Members must not need owner permissions to use ordinary member functionality.

---

# 20. COMMUNITY OUTCOME ANALYTICS

All analytics must be real and traceable.

### Owner analytics

Measure, where actual data exists:

- Requests created.
- Requests receiving offers.
- Offers accepted.
- Tasks assigned.
- Tasks completed.
- Confirmed outcomes.
- Disputed outcomes.
- First meaningful member actions.
- Distinct participating members.
- Response times.
- Completion times.
- Contribution categories.
- Review backlog.
- Events registered.
- Actual attendance confirmations.
- Community knowledge usage.
- Link visits and meaningful actions.
- Referrals and their resulting actions.
- Outcome sharing and resulting permitted visits.

### Member analytics

Where appropriate, provide personal progress summaries.

Clearly separate private personal statistics from public achievements.

### Integrity rules

- Every metric has a documented definition.
- No hardcoded production figures.
- No fake historical charts.
- No duplicate counting.
- No unverified success statistics.
- No private data leakage.
- No automatic global reputation score.
- Missing data must be labeled.
- Test records must be excluded from real reports.

---

# 21. ADMINISTRATION AND SECURITY

Implement:

- Secure authentication.
- Server-side authorization.
- Role-based permissions.
- Multi-tenant isolation.
- Audit logs.
- Secure file uploads.
- Public link security.
- Expiration and revocation.
- Rate limiting.
- Input validation.
- Webhook signature or secret validation as applicable.
- Session security.
- Server-side environment secrets.
- Safe error reporting.
- Duplicate action protection.
- Idempotency for external events.
- Database integrity constraints.
- Backup and migration strategy.

Never expose platform bot tokens in frontend code.

Never log secret values.

Never allow a public link to reveal unrelated private records.

Do not collect or store unnecessary sensitive information.

Allow members to control their own profile and record visibility.

---

# 22. REAL DISCORD AND TELEGRAM INTEGRATION REQUIREMENTS

Use official platform APIs and the existing authorized credentials.

### Discord configuration

Support the secure server-side variables:

- DISCORD_BOT_TOKEN.
- DISCORD_APPLICATION_ID.
- DISCORD_PUBLIC_KEY.

Verify actual bot authentication, installation, permissions and interactions.

Register and test slash commands.

Link authorized Discord servers to the right Community OS community.

Do not request Administrator permissions without a genuine necessity.

Respect Discord's privileged Gateway Intent and permission rules.

### Telegram configuration

Support:

- TELEGRAM_BOT_TOKEN.
- TELEGRAM_WEBHOOK_SECRET.

Verify bot identity using Telegram's actual API.

If webhook architecture is used, validate the secret header and verify the registered HTTPS endpoint.

If using polling, use one controlled update consumer.

Support actual group or channel linking through permitted bot interactions.

Respect Telegram group privacy and available API permissions.

### Integration status

Each integration must distinguish:

- Not configured.
- Credentials present but unverified.
- Authentication failed.
- Authenticated.
- Connected.
- Connected with restricted permissions.
- Disconnected.
- External API unavailable.

Credentials alone do not prove that an integration works.

### Cross-platform consistency

Test all important shared workflows:

- A web-created request can be retrieved through the authorized bot.
- A supported bot action is persisted in the shared database.
- An offer from one interface appears in the other.
- A task update appears consistently.
- A contribution submitted through a supported path appears in the same ledger.
- A real status change triggers the correct notification.

---

# 23. DATABASE AND CORE ENTITIES

Design the relational schema carefully.

Include appropriate entities for:

- Users.
- UserProfiles.
- MemberPassports.
- Skills.
- Communities.
- CommunityMemberships.
- CommunityRoles.
- RolePermissions.
- PlatformIdentities.
- DiscordConnections.
- TelegramConnections.
- CommunityRequests.
- RequestCategories.
- Offers.
- Matches.
- ExpertProfiles.
- Appointments.
- Polls.
- PollOptions.
- Votes.
- Decisions.
- ExecutionPlans.
- PlanParticipants.
- Tasks.
- Checklists.
- TaskAssignments.
- Commitments.
- Handoffs.
- Events.
- EventRegistrations.
- AttendanceConfirmations.
- ContributionTypes.
- Contributions.
- ContributionEvidence.
- ContributionReviews.
- ContributionConfirmations.
- Disputes.
- Appeals.
- TrustSources.
- PortableRecords.
- OutcomeRecords.
- OutcomeCards.
- OutcomePortfolioItems.
- KnowledgeArticles.
- KnowledgeSources.
- KnowledgeVersions.
- SourceTrails.
- CommunityLinks.
- LinkPermissions.
- LinkEvents.
- ReferralAttributions.
- IssueReports.
- Notifications.
- NotificationPreferences.
- NotificationDeliveries.
- WorkflowTemplates.
- WorkflowExecutions.
- AgentActionLogs.
- IntegrationHealthChecks.
- BotEvents.
- AuditLogs.
- TestRuns.
- MiniAppVersions.
- MiniAppTestResults.

Reuse existing tables when appropriate.

Do not create duplicate schemas for similar concepts that should be related through well-defined relationships.

Use transactions, unique constraints, foreign keys and appropriate indexes.

Do not use browser localStorage as the main database for persistent business records.

---

# 24. UI AND DESIGN REQUIREMENTS

Create a polished modern SaaS interface.

### Visual direction

- Professional dark-first interface.
- Clear visual hierarchy.
- Restrained colors.
- Clean typography.
- Consistent spacing.
- Useful data cards.
- Distinct status labels.
- Well-designed tables and forms.
- Accessible contrast.
- Calm, uncluttered navigation.

Avoid excessive gradients and decorative dashboards.

### Language

Support Arabic RTL and English LTR from the beginning.

Use proper localization for all interface strings.

Do not mix layout directions incorrectly when changing languages.

### Mobile-first usability

Optimize for mobile devices because many Discord and Telegram users access the product through phones.

Implement:

- Responsive owner navigation.
- Responsive member navigation.
- Single-column layouts on narrow screens.
- Large touch targets.
- Readable typography.
- Simple forms.
- Mobile-friendly public links.
- Compact cards.
- Accessible dialogs.
- No unwanted horizontal scrolling.

### Primary screens

Build the required screens for:

1. Landing page.
2. Registration and authentication.
3. Community creation.
4. Owner onboarding.
5. Member onboarding.
6. Owner dashboard.
7. Member dashboard.
8. Community Action Hub.
9. Requests.
10. Request detail.
11. Offers.
12. Tasks.
13. Events.
14. Poll2Plan.
15. Execution plans.
16. Contribution Ledger.
17. Contribution review.
18. Dispute Center.
19. Member Passport.
20. Portable Trust Profile.
21. Outcome Portfolio.
22. Community Links.
23. Link Manager.
24. Knowledge Repository.
25. Trusted Source Cards.
26. Expert Exchange.
27. Community Outcome Analytics.
28. GuildGrowth.
29. Community Agent Kits.
30. Discord Integration Center.
31. Telegram Integration Center.
32. Notification Center.
33. Privacy and Consent.
34. Platform Identity Connections.
35. Community Settings.
36. Audit History.
37. MiniApp Testing Center where applicable.

Every screen must have meaningful functionality, proper data loading, error handling and permissions.

---

# 25. DEVELOPMENT EXECUTION STRATEGY

Implement the full product using the following sequence.

These stages control development order; they do not reduce the required product scope.

### PHASE 1 — Technical Foundation

Create:

- Repository structure.
- Frontend.
- Backend.
- PostgreSQL connection.
- Database schema.
- Migrations.
- Authentication.
- Community model.
- Membership and role permissions.
- Arabic and English layout.

Verify the build and authentication.

Create a checkpoint.

### PHASE 2 — Shared Core Workflows

Implement:

- NeedSignal.
- Match & Offer.
- Expert Exchange.
- Poll2Plan.
- Tasks and QuestLoop.
- Commitment Ledger.
- MoveSure.
- TrustGraph.
- Contribution Ledger.
- Approval and dispute workflow.

Complete and test the full request-to-outcome journey.

Create a checkpoint.

### PHASE 3 — Member and Owner Experiences

Implement:

- Member Space.
- Member Passport.
- Community Inbox.
- Opportunity Feed.
- Portable Trust Profile.
- Outcome Portfolio.
- Group Activation.
- Owner Workspace.
- Community Outcome Analytics.
- Member Recovery.
- GuildGrowth.
- Community Agent Kits.

Test both sides of the product.

Create a checkpoint.

### PHASE 4 — Community Link System

Implement the dedicated Link Manager and all eligible Link-1 and Link-3 through Link-26 concepts.

Keep Link-2 tipping and ALT-7 financial tipping excluded.

Implement secure sharing, permissions, expiry, revocation, attribution and result reporting.

Create a checkpoint.

### PHASE 5 — Discord Integration

Implement:

- Bot authentication.
- Server linking.
- Slash commands.
- GuildGrowth.
- QuestLoop.
- GuildTest.
- IntentReady.
- GuildPass.
- AI Builder Pass.
- GuildDrops.
- Shared notifications.

Test against a genuine authorized test server when available.

Create a checkpoint.

### PHASE 6 — Telegram Integration

Implement:

- Bot authentication.
- Group and channel linking.
- Commands.
- Inline keyboards.
- ChannelFlow.
- Telegram Community OS.
- Telegram Trust Network.
- MiniApp PartnerOS.
- MiniApp TrustCheck.
- BotRelay.
- Mini App context and permission checks.
- MiniApp TrustPass.
- Shared notifications.

Only claim live connectivity after actual verification.

Create a checkpoint.

### PHASE 7 — Reliability, Security and Final Regression

Run complete:

- Type checks.
- Linting.
- Production build.
- Database tests.
- API tests.
- Integration tests.
- End-to-end tests.
- Permission tests.
- Security checks.
- Arabic RTL tests.
- English LTR tests.
- Mobile UX tests.

Fix discovered root causes and rerun the relevant tests.

Do not enter endless speculative repair cycles.

---

# 26. REQUIRED END-TO-END USER JOURNEYS

These are mandatory acceptance tests.

### JOURNEY A — Owner Onboarding

Create account → create community → set roles → complete onboarding settings → connect Discord or Telegram → verify integration → create Community Hub Link → share the link.

### JOURNEY B — Member Requests Help

Open community link → view the community → create NeedSignal request → persist request → notify eligible users → receive offers → select an offer.

### JOURNEY C — Helper Completes Work

Open opportunity → submit offer → get accepted → receive task → execute work → submit evidence → request review → receive verification decision → obtain contribution record.

### JOURNEY D — Mutual Trust

Record agreement → first party confirms → second party confirms or disputes → evidence is reviewed → resolution is recorded → authorized outcome record becomes shareable.

Silence must never be treated as confirmation.

### JOURNEY E — Poll2Plan

Create poll → collect votes → record decision → generate execution plan → assign tasks → follow checklist → confirm outcome.

### JOURNEY F — Member Portable Records

Select a verified contribution → configure sharing → generate portable card → share it with another community → verify the source and status → revoke future access.

### JOURNEY G — Community Links

Create a link → apply permissions → share it → perform an action → verify persistence → update its status → view the actual results.

### JOURNEY H — Discord

Use a real Discord command to retrieve an authorized community request → submit a supported response → verify that the web dashboard and database reflect the same action.

### JOURNEY I — Telegram

Use a real Telegram command or inline keyboard → open a relevant workflow → submit a supported action → verify that the same persisted record appears in the web application.

### JOURNEY J — Cross-Community Opportunity

A member explicitly shares an allowed request with selected communities → another community receives the permitted request → a helper responds → the request owner follows the same record and result.

### JOURNEY K — Knowledge Freshness

Publish a sourced knowledge item → set review date → create a revision → mark old information superseded → verify users can distinguish the current version.

### JOURNEY L — Security

Try accessing another community's private request, another member's evidence, an expired link and a revoked record link.

Confirm that unauthorized access is denied.

---

# 27. QUALITY, RELIABILITY AND ANTI-LOOP REQUIREMENTS

Avoid the repeated automatic error-fixing cycle.

For every reproducible error:

1. Capture the exact message.
2. Locate the root cause.
3. Identify dependent failures.
4. Apply the smallest safe fix.
5. Run a targeted verification.
6. Run related regression tests.
7. Mark the issue verified when evidence supports it.

Do not repeatedly apply the same unsuccessful repair.

After three unsuccessful repair approaches for the same root cause, stop speculative code changes and investigate configuration, dependencies, platform limitations or environment behavior.

Do not:

- Disable strict type checking.
- Remove tests to produce a green report.
- Ignore failed API responses.
- Use fake success data.
- Replace real integrations with mocks.
- Rewrite stable files without evidence.
- Change unrelated modules to fix a local defect.
- Modify database schemas unnecessarily.
- claim zero errors without evidence.

Test mocks may be used for isolated tests, but must be distinguished from real external API tests.

---

# 28. FINAL DEFINITION OF COMPLETE

The product is only considered complete when:

1. Both owner and member workflows exist.
2. Communities are properly isolated.
3. The shared core request-to-outcome workflow works.
4. Contribution evidence and verification work.
5. Disputes and appeals work according to permissions.
6. The Member Passport is separate from contribution history.
7. Portable Trust Profiles and Outcome Portfolios work.
8. The Community Link Manager works.
9. All specified non-payment link concepts are accounted for.
10. Poll2Plan and commitments work.
11. Community Knowledge and SourceTrail work.
12. Owner analytics use genuine data.
13. Discord authentication and server integration are genuinely tested where available.
14. Telegram authentication and group integration are genuinely tested where available.
15. Supported bot interactions use the same backend and database.
16. The mobile experience is usable.
17. Arabic RTL and English LTR both work.
18. Security and permission tests pass.
19. No fake production metrics or connection states exist.
20. Stable project checkpoints and setup documentation exist.

A feature is not complete merely because it has a page, button or database table.

A bot is not connected merely because its token has been entered.

A request is not completed merely because a member clicked a completion button.

A contribution is not verified merely because its owner submitted it.

---

# 29. FINAL DELIVERY REPORT

At the end of development, produce a structured report containing:

### Product Architecture
Frameworks, database, modules and project structure.

### Feature Inventory
Every feature, whether implemented, tested, unavailable or blocked.

### Owner Experience
Complete list of owner workflows and their actual status.

### Member Experience
Complete list of member workflows and their actual status.

### Community Link System
Separate status for every implemented link type.

### Discord Integration
Authentication, server association, commands, permissions and real testing evidence.

### Telegram Integration
Authentication, group/channel association, commands, webhook or polling status, Mini App scope and real testing evidence.

### Data Integrity
How every metric is calculated and how test data is separated.

### Tests
Actual commands, tests executed, failures, fixes and final results.

### Security
Permissions, privacy, tenant isolation and remaining risks.

### Known Limitations
Anything that cannot be verified in the current environment and the exact reason.

### Checkpoints
What was saved and how the project can be restored or continued.

Do not fabricate test counts or declare incomplete modules complete.

---

# 30. EXECUTE NOW

Build the complete Community OS project in the existing AI Studio environment.

Start by establishing the architecture and database, then implement each phase in order.

Do not reduce the specification to a simple prototype.

Do not omit independently defined feature concepts.

Do not build payment processing, subscriptions, billing, tips, cash bounties, commissions, payouts, checkout or financial transaction systems. These are explicitly outside the scope of this project.

Make the entire core product functional without any payment provider.

Do not stop at the first phase.

Do not stop after producing a plan.

Do not claim success without evidence.

Preserve each verified development checkpoint.

**The final result must be one unified Community OS platform serving community owners and members, with real Discord and Telegram integrations, a universal actionable link system, portable and verifiable outcomes, and genuine community-level value.**