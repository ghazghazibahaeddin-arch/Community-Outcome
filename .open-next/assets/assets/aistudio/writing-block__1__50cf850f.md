# COMMUNITY OS — COMPLETE REAL-WORLD IMPLEMENTATION, DUAL WORKSPACES, REAL DISCORD & TELEGRAM OPERATIONS, AND FULL USER-VERIFIED QUALITY ASSURANCE

## MASTER EXECUTION DIRECTIVE

You are the principal software architect, senior full-stack engineer, backend engineer, database engineer, Discord integration engineer, Telegram integration engineer, QA engineer, security engineer, accessibility engineer, and product UX engineer responsible for this project.

You are working on the CURRENT EXISTING Community OS project shown in the AI Studio preview.

The current project already displays a Community OS interface with sections including:

- Community Hub.
- NeedSignal.
- QuestLoop.
- Trust.
- Member Passport.
- Community Links.
- Knowledge & Sources.
- Outcome Analytics.
- Integrations.
- A selected community such as DevForge Builders.
- Structured Needs and Requests.
- Accepted Matches.
- Completed Deliverables.
- Verified Outcomes.
- Unique Active Contributors.
- Task and execution checklists.
- Contribution Ledger.
- TrustGraph Attestations.
- Community Shield.
- Discord and Telegram community references.
- An End-to-End Suite entry point.

Preserve the existing working project and its useful interface.

Do not create another unrelated prototype.

Do not replace the current application with static pages.

Do not destroy working functionality.

Your mission is to make the CURRENT Community OS a genuinely operational platform for community owners and members, connected to real Discord servers and Telegram groups through actual authorized integrations.

The platform, database, bots, links, actions, metrics, notifications and permissions must work as one coherent system.

# PART 1 — THE NON-NEGOTIABLE PRODUCT PROMISE

Community OS must fulfill this promise:

**A community owner can connect their real Discord server or Telegram group, manage their community from a dedicated owner workspace, publish actionable links, and operate real workflows inside their community through the bots. An ordinary member can use a separate member workspace or perform supported actions directly inside Discord or Telegram, with all actions reflected consistently in the central platform.**

Every meaningful feature must provide genuine value to the person using it.

There are three connected product surfaces:

1. The Community OS web platform.
2. The owner and moderator experience inside the platform.
3. The member and owner experience inside Discord and Telegram through authorized bots and interactive workflows.

The web platform is the central source of truth.

Discord and Telegram are actual interaction surfaces, not decorative integrations.

Community Links are actionable entrances into the same shared application workflows.

Never create three independent copies of the same business logic.

---

# PART 2 — ABSOLUTE ZERO-FABRICATION POLICY

This is one of the highest-priority requirements.

**Never invent a number, activity, user, successful operation, connection, contribution, event, task, verification result or analytics value.**

This rule applies to every screen, card, badge, report, chart, notification, integration status and test result.

## 2.1 No fabricated metrics

Do not invent:

- Community member counts.
- Active member counts.
- Number of requests.
- Number of accepted offers.
- Number of completed tasks.
- Number of verified contributions.
- Number of verified outcomes.
- Number of participants.
- Number of registered users.
- Engagement percentages.
- Referral conversions.
- Event attendance.
- Response times.
- Completion rates.
- Bot uptime.
- Number of bot commands executed.
- Link visits.
- Link conversions.
- Community growth.
- Historical charts.
- Achievement counts.
- Trust scores.
- Integration success percentages.

Every displayed metric must be calculated from genuine persisted records or an actual authorized external platform response.

## 2.2 Audit the numbers already visible in the current interface

The current preview displays example values, including:

- Structured Needs: 3.
- Accepted Matches: 1.
- Completed Deliverables: 0.
- Verified Outcomes: 1.
- Unique Active Contributors: 2.

It also shows sample-looking requests, task descriptions, contributor identities, verified ledger entries and Discord/Telegram community references.

Do not assume these values are real.

For each displayed record and metric:

1. Find its actual database source.
2. Identify whether it is a real record, a test record, a demo seed or a hardcoded placeholder.
3. Verify how the value was calculated.
4. Check whether it belongs to the selected community.
5. Confirm that it uses the correct status and date range.

If the value is not supported by genuine data:

- Remove it from production metrics.
- Or clearly isolate and label it as DEMO DATA.
- Never mix it with genuine community activity.

Do not leave example metrics visible as real community results.

## 2.3 Metric definitions

Use the following strict distinctions:

- A member joining is not a meaningful contribution.
- A link visit is not an action.
- An action started is not an action submitted.
- An action submitted is not an accepted offer.
- An accepted offer is not a completed task.
- A task marked complete by its owner is not automatically a verified outcome.
- A submitted contribution is not a verified contribution.
- An RSVP is not confirmed attendance.
- A bot token is not a successful bot connection.
- A notification created is not necessarily a notification delivered.
- A simulated test is not a live integration test.

If there is insufficient data, show:

- No data yet.
- Not available.
- Awaiting activity.
- Not connected.
- Unable to verify.

Use an actual zero only when the database query establishes that the actual count is zero.

## 2.4 Demo and production isolation

If development data is necessary:

- Use an isolated test namespace or test database.
- Clearly mark all test records.
- Keep test metrics out of real community dashboards.
- Do not create fake users in production.
- Do not let test records influence trust rankings.
- Do not claim test records are real member accomplishments.

---

# PART 3 — TWO DISTINCT WORKSPACES: OWNER AND MEMBER

This is mandatory.

Do not build a single owner-oriented dashboard and expect ordinary members to use it.

The platform must have two distinct, complete user experiences that share the same backend.

## 3.1 COMMUNITY OWNER WORKSPACE

Create a dedicated owner area.

Suggested route:

`/owner/:communityId`

The owner must have a central control panel for the selected community.

It must include:

### Owner Dashboard

- Real community status.
- Actual request pipeline.
- Offers awaiting review.
- Tasks needing assignment.
- Active execution plans.
- Contributions awaiting review.
- Disputes requiring action.
- Current event operations.
- Knowledge requiring review.
- Community Link Manager.
- Discord connection health.
- Telegram connection health.
- Community Outcome Analytics.
- Audit history.
- Integration settings.
- Community configuration.

### Owner Operations Center

Provide a prioritized queue showing actions the owner should take.

Examples:

- New request awaiting review.
- Offer awaiting acceptance.
- Request without responses.
- Task approaching its deadline.
- Contribution requiring verification.
- Member appeal awaiting review.
- Expiring Community Link.
- Disconnected or permission-restricted bot.
- Outdated knowledge article.
- Event requiring attendance confirmation.

Every notification must relate to an actual existing record.

Every item must open the correct record and perform the advertised action.

### Owner Permissions

Allow the owner to configure:

- Community administrators.
- Moderators.
- Reviewers.
- Task managers.
- Event organizers.
- Expert roles.
- Member permissions.
- Public link permissions.
- Contribution review rules.
- Trust and dispute policies.
- Bot notification preferences.
- Allowed integrations.

A community owner must not need to manually edit the database or source code to manage these settings.

## 3.2 MEMBER WORKSPACE

Create a separate personal area.

Suggested route:

`/me`

A normal member must never need owner permissions to use the following functionality.

### Member Dashboard

Show actual records belonging to the authenticated member:

- My communities.
- My requests.
- My offers.
- My accepted offers.
- My assigned tasks.
- My execution plans.
- My commitments.
- My events.
- My contributions.
- My pending reviews.
- My verified achievements.
- My rejected or disputed contributions.
- My appeals.
- My notifications.
- My shared records.
- My Community Inbox.

### Member Profile

Allow the member to manage:

- Display name.
- Bio.
- Skills.
- Interests.
- Languages.
- Experience descriptions.
- Preferred collaboration.
- Portfolio links.
- Visibility preferences.

### Member Passport

This must remain distinct from the contribution record.

It represents the member's identity, skills and selected experience.

Support:

- Self-declared skills.
- Evidence-supported skills.
- Independently verified skills only when a real verification process exists.
- Selected public fields.
- Community-only visibility.
- Private visibility.
- Shareable profile links.

### Personal Contributions

Show the member's complete authorized contribution history.

Each item must have its own real status, source and review history.

### Member Privacy

Allow members to control:

- Who can view their profile.
- Which contribution records they share.
- Which communities may receive selected records.
- Which links remain active.
- Which personal notifications they receive.
- Whether Discord and Telegram identities remain linked.
- Whether a shared record can be revoked.

Never expose private member information to community owners without a valid permission or community purpose.

---

# PART 4 — REAL COMMUNITY CREATION AND OWNER CONNECTION

A community owner must be able to connect the real group or server they own or administer.

A text label containing a server name is not an integration.

A URL pointing to a group is not proof of a connection.

A bot token in an environment variable is not proof that the bot has been installed or is operational.

## 4.1 Community onboarding

Build a complete owner onboarding flow:

1. Register or sign in.
2. Create a new Community OS community.
3. Enter community name and description.
4. Select its type.
5. Configure basic privacy.
6. Select contribution categories.
7. Define review roles.
8. Choose whether to connect Discord, Telegram or both.
9. Connect the real platform community.
10. Verify the connection.
11. Choose the workflows to activate.
12. Create its Community Hub Link.
13. Publish the link.
14. Run an actual test action.
15. View the real resulting record in the owner dashboard.

The web platform must remain usable if the owner chooses not to connect a bot.

## 4.2 Community ownership and authorization

Verify that the person connecting a server or group is authorized to do so.

Do not link arbitrary communities based on their names.

Do not allow one platform community to be connected to an unrelated Community OS tenant without proper authorization and an explicit mapping.

Provide a verification process that distinguishes:

- Connection requested.
- Owner authorization pending.
- Platform identity verified.
- Bot installed.
- Permissions checked.
- Community mapping confirmed.
- Active.
- Restricted.
- Disconnected.
- Reconnection required.

---

# PART 5 — REAL DISCORD INTEGRATION

The Discord integration must work with the actual Discord Developer Application and installed bot.

Use the secure environment variables:

- `DISCORD_BOT_TOKEN`
- `DISCORD_APPLICATION_ID`
- `DISCORD_PUBLIC_KEY`

Do not expose these credentials to frontend code, logs, screenshots or public repositories.

## 5.1 Real Discord installation

Provide a working Connect Discord button.

Use the official Discord installation/OAuth2 flow with only the scopes and bot permissions required by implemented functionality.

Support the required installation context for server communities.

Verify:

- The authorized installer.
- The selected guild.
- The application identity.
- Bot presence.
- Required permissions.
- Actual connection state.
- Mapping to the corresponding Community OS community.

Do not assume every user can install the bot.

Require the appropriate server management authority.

Do not request Administrator permission by default.

## 5.2 Discord interaction architecture

Choose one supported architecture for receiving interactions:

- Discord Gateway through the actual bot connection.
- Discord HTTP outgoing interactions through a publicly accessible interactions endpoint.

Do not mix incompatible interaction delivery models.

If HTTP interactions are selected:

- Implement the real public POST endpoint.
- Preserve and use the raw request body for signature verification.
- Validate `X-Signature-Ed25519`.
- Validate `X-Signature-Timestamp`.
- Reject invalid signatures with HTTP 401.
- Handle Discord PING interactions correctly.
- Respond to actual supported interaction types.
- Prevent replay attacks using timestamp freshness validation.
- Respond within Discord's required interaction acknowledgement window.
- Handle duplicate interactions safely.

If Gateway is selected:

- Establish and maintain the real gateway connection.
- Register slash commands through the proper Discord HTTP API.
- Handle reconnects and gateway errors.
- Correctly acknowledge interactions.

Do not build an HTTP endpoint and claim live Discord commands work unless Discord actually delivers interactions to it.

## 5.3 Discord bot commands

Implement real working commands appropriate to permissions and context:

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

Each command must:

1. Parse real user input.
2. Authenticate the platform interaction.
3. Identify the correct Discord user.
4. Resolve the linked Community OS identity where available.
5. Resolve the correct server and community.
6. Check permissions.
7. Call the real shared backend service.
8. Persist the operation when applicable.
9. Return a truthful success or failure response.
10. Log the event without exposing credentials.

Use buttons, menus, select menus and modals where helpful.

Long or sensitive workflows may open secure Community OS forms.

## 5.4 Discord owner commands

Provide owner/moderator commands for authorized users, including appropriate operations such as:

- Viewing outstanding requests.
- Reviewing offers.
- Managing task assignments.
- Reviewing contributions.
- Viewing relevant community status.
- Publishing approved links.
- Inspecting bot health.
- Opening the owner dashboard.

Apply backend authorization on every command.

Hiding a command in the Discord UI is not a substitute for backend permission checks.

## 5.5 Discord member commands

Ordinary members must be able to use relevant member functionality without administrator permission.

Examples:

- Create a structured request.
- Offer help.
- View assigned tasks.
- Follow task status.
- Submit supported evidence.
- View their own contribution records.
- View upcoming events.
- Open their Member Space.
- Link their identity.
- Retrieve their permitted personal links.

## 5.6 Discord capabilities and limitations

Do not assume full access to all server messages, private channels, member data or history.

Use the actual permissions and Gateway Intents available to the application.

Do not require privileged intents when an action-based workflow can accomplish the same product purpose.

Use supported Discord features and official APIs.

Do not automate normal user accounts or create self-bots.

---

# PART 6 — REAL TELEGRAM INTEGRATION

Telegram is a first-class product surface.

Use:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`

The bot must connect to actual Telegram groups and channels when authorized.

## 6.1 Telegram bot authentication

Call Telegram's actual bot identity verification endpoint.

Verify the real bot identity and username.

Do not mark the bot connected simply because the token exists.

## 6.2 Telegram group linking

Provide a clear owner flow:

1. Start Telegram connection from the Community OS owner area.
2. Show the correct bot identity.
3. Allow the owner to add the bot to their group or channel.
4. Explain the required bot permissions.
5. Ask the owner to initiate a genuine verification interaction or perform another supported verification action.
6. Verify the chat/group identity through Telegram's actual API and permitted update data.
7. Link the verified Telegram group to the selected Community OS community.
8. Confirm the mapping.
9. Show the real integration health.

Do not connect a group merely because someone entered its name or username.

## 6.3 Telegram webhook

If using a webhook:

- Use a real public HTTPS endpoint after deployment.
- Implement `setWebhook`.
- Use the configured `TELEGRAM_WEBHOOK_SECRET`.
- Validate the `X-Telegram-Bot-Api-Secret-Token` header.
- Reject invalid secrets.
- Process actual incoming updates.
- Prevent duplicate update processing.
- Store the actual update status.
- Verify configuration using `getWebhookInfo`.
- Correctly handle delivery failures.
- Never register placeholder URLs.
- Never report a successful webhook when one has not been registered.

If the application is not deployed, clearly mark live webhook status as unconfigured.

Do not invent a public endpoint.

If using long polling, implement one controlled update consumer and avoid conflicting webhook and polling workers.

## 6.4 Telegram commands

Implement meaningful working commands:

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

Use inline keyboards and clear contextual responses.

The member should be able to perform supported actions directly inside Telegram, rather than receiving only a generic link to the website.

## 6.5 Telegram group and privacy limitations

Do not assume bots can read all messages in every group.

Respect Telegram group privacy settings, channel permissions and Bot API capabilities.

Build action-based interaction using commands, mentions, inline keyboards, callbacks and authorized bot actions.

Do not promise unrestricted access to group history or all member information.

## 6.6 Telegram Mini Apps

Where appropriate, implement an optional Telegram Mini App experience for:

- Member Space.
- Community Action Hub.
- Help requests.
- Offers.
- Task tracking.
- Member Passport.
- Contribution views.
- Community Links.

Validate Telegram Mini App `initData` on the backend.

Never trust `initDataUnsafe` as authoritative identity information.

Validate signature and freshness.

Make the Mini App a genuine interface to the same backend, not a second application.

If Mini App functionality is not actually configured, do not show it as connected or live.

---

# PART 7 — REAL IDENTITY LINKING BETWEEN WEB, DISCORD AND TELEGRAM

A member must be able to use the same Community OS account across the website and connected platforms.

Implement:

- Account-to-Discord linking.
- Account-to-Telegram linking.
- One-time verification challenges.
- Challenge expiration.
- Confirmation before linking.
- Unlinking.
- Revocation.
- Re-linking.
- Duplicate identity prevention.
- Identity ownership checks.
- Audit history.

Never associate accounts solely because usernames look similar.

Never allow a Telegram or Discord user to inherit another person's identity.

If identity linking has not been completed, the bot must identify the person as an unlinked platform user and offer a safe linking procedure.

---

# PART 8 — ONE SHARED ENGINE FOR WEBSITE AND BOTS

This is critical.

All three surfaces must access the same actual business logic and data.

For example:

1. An owner creates a request in the web platform.
2. The request is stored in the central database.
3. A Discord user invokes `/requests`.
4. The bot retrieves the same real request through the backend.
5. A member submits an offer in Discord.
6. The offer is persisted in the same database.
7. The owner sees that offer in the web dashboard.
8. The owner accepts it.
9. Discord and Telegram can report the updated status to authorized participants.
10. The task is completed.
11. Evidence is submitted and reviewed.
12. A genuine contribution record is created.
13. A verified outcome appears in the owner's dashboard.
14. The member can access and share the permitted contribution record.

Repeat the equivalent journey through Telegram.

Do not implement separate data structures or contradictory state transitions for web, Discord and Telegram.

---

# PART 9 — NEEDSIGNAL: REAL STRUCTURED COMMUNITY REQUESTS

Implement the full request system.

Members can create, edit, follow and close authorized requests.

Each request includes:

- Title.
- Description.
- Category.
- Requested help.
- Required skills.
- Priority.
- Expected result.
- Deadline.
- Community.
- Author.
- Visibility.
- Supporting information.
- Status.
- Source platform.

Support statuses:

- Draft.
- Open.
- Needs information.
- Receiving offers.
- Matched.
- Assigned.
- In progress.
- Waiting.
- Completed.
- Closed.
- Cancelled.
- Disputed.

The same request must be accessible through permitted website, Discord, Telegram and Community Link actions.

---

# PART 10 — MATCH & OFFER AND COMMUNITY EXPERT EXCHANGE

Implement offers connected to specific requests.

Members can:

- Offer help.
- Describe their skills.
- State availability.
- Provide a proposed approach.
- Add relevant portfolio links.
- Withdraw an offer where allowed.
- See the acceptance decision.

Request owners can:

- Review offers.
- Compare proposals.
- Accept one.
- Reject others with an optional reason.
- Assign the work.
- Track progress.

Implement Community Expert Exchange as a distinct service directory where members opt in to list expertise, preferred availability and types of help offered.

Support optional appointment scheduling without payment.

Do not automatically select offers.

Do not create unverified skill claims.

---

# PART 11 — POLL2PLAN AND SHAREABLE EXECUTION PLANS

Keep Poll2Plan distinct from ordinary tasks.

Implement:

- Decision questions.
- Alternatives.
- Poll responses.
- Closing rules.
- Results.
- Decision records.
- Approval context.
- Conversion of the decision into an execution plan.

The plan must include:

- Expected outcome.
- Participants.
- Assigned responsibilities.
- Tasks.
- Due dates.
- Checklists.
- Progress.
- Blockers.
- Completion confirmation.

Create shareable execution plan links with correct permissions.

Do not treat a poll vote as task completion or as a personal commitment unless the member explicitly accepts the resulting commitment.

---

# PART 12 — QUESTLOOP, MOVE SURE, INTENTREADY AND PROMISEGRAPH

Keep each feature distinct.

## QuestLoop

Community tasks and challenges with deliverables, acceptance criteria, owners, deadlines, evidence and review.

## MoveSure

Responsible task handoffs with outgoing and incoming owners, context, evidence and acceptance of handoff.

## IntentReady

Turn declared interest into an explicit action and track whether the member makes a commitment.

## PromiseGraph

Maintain a record of commitments between people, with responsibility, deadline changes, status and confirmation.

Do not infer commitments from casual reactions or conversations.

---

# PART 13 — CONTRIBUTION LEDGER, TRUSTGRAPH AND COMMUNITY SHIELD

## Contribution Ledger

Maintain actual contribution records with source, community, member, related task or request, evidence, review status and history.

## MOD-1 — Contribution Taxonomy

Allow each community to define its own meaningful contribution types and transparent rules.

Examples:

- Technical help.
- Mentoring.
- Documentation.
- Moderation.
- Event organization.
- Task execution.
- Knowledge sharing.
- Project delivery.

## Link-1 — Contribution Ranking

Provide transparent and configurable ranking by contribution type.

Never use an opaque universal reputation score.

## Link-3 — Contribution-Linked Thanks

Allow members to thank another member in relation to a specific contribution.

This is recognition only, not money or tipping.

## TrustGraph

Implement outcome verification with actual evidence, confirmation sources and clear status.

## ALT-8 — Contribution Approval Workflow

Authorized reviewers can approve, reject with reasons, request evidence or correct a record.

## MOD-3 — Mutual Outcome Confirmation

Allow both relevant parties to confirm or dispute an outcome independently.

Silence never means agreement.

## Community Shield

Implement dispute review, appeals, corrections, reviewer assignment and audit history.

Protect members against silent or unreviewable changes to their records.

A self-submitted claim must not automatically become verified.

---

# PART 14 — MEMBER PASSPORT AND PORTABLE RECORDS

Build all of these as separate modules.

## Member Passport

Member-controlled identity, skills, interests and selected profile information.

## Portable Trust Profile — User-2

Selected verified records that the member chooses to share between communities.

## Portable Contribution Card — ALT-5 and Link-5

One individual contribution card.

## Portable Outcome Record — ALT-4

A specific shared outcome or completed project.

## Outcome Portfolio — User-5

A member-controlled collection of selected outcomes from multiple communities.

## Privacy and Consent Controls — User-4

Control visibility, audience, expiration and revocation of shares.

Do not expose entire contribution history through a single public URL.

Do not automatically copy private records to another community.

---

# PART 15 — THE COMPLETE COMMUNITY LINK SYSTEM

Implement the dedicated Community Link Manager.

Each link must execute a genuine action or show a clearly defined authorized record.

Support:

- Community Hub Link.
- Help Request Link.
- Offer Link.
- Appointment Link.
- Event RSVP Link.
- Execution Checklist Link.
- Contribution Evidence Link.
- Contribution Review Link.
- Trusted Knowledge Source Link.
- Role-Based Onboarding Link.
- Task and Bounty Link.
- Request Status Link.
- Multi-Community Help Link.
- Attendance Confirmation Link.
- Contribution Card Link.
- Referral Attribution Link.
- Issue Reporting Link.
- Audience and Expiration Controls.
- Owner Outcome Report Link.
- Owner Dashboard Link.
- Portable Records.

Preserve the following separate named concepts:

- Link-1: Valuable Contribution Ranking.
- Link-2: Monetary tipping is excluded.
- Link-3: Contribution-specific thanks.
- Link-4: Confirmable contribution record.
- Link-5: Portable contributor card.
- Link-6: Owner dashboard access link.
- Link-7: Community Bounties with non-monetary recognition only.
- Link-8: Approval, appeal and dispute rules.
- Link-09: Short help request form.
- Link-10: Skill or service offer card.
- Link-11: Lightweight appointment booking.
- Link-12: Event RSVP.
- Link-13: Execution checklist.
- Link-14: Submit contribution evidence.
- Link-15: Approve/reject contribution with reasons and appeal.
- Link-16: Trusted source card.
- Link-17: Role-based onboarding.
- Link-18: Task or bounty card with non-financial recognition.
- Link-19: Manual request status tracking.
- Link-20: Multi-community help with explicit consent.
- Link-21: Attendance or activity confirmation.
- Link-22: Single contribution public card.
- Link-23: Referral attribution.
- Link-24: Issue reporting.
- Link-25: Link access, expiry and revocation.
- Link-26: Owner report of actual outcomes from a link.

For every link, implement:

- Secure random tokens.
- Correct destination.
- Permissions.
- Expiration.
- Revocation.
- Replacement.
- Rate limits.
- Accurate status tracking.
- Attribution where consent and platform capabilities permit.
- Real action persistence.
- Real success and failure messages.

Do not count visits as completed actions.

---

# PART 16 — COMMUNITY KNOWLEDGE AND SOURCETRAIL

Implement Community Knowledge Publisher.

Allow authorized moderators to convert selected information into structured knowledge pages with:

- Source.
- Author.
- Owner.
- Category.
- Version.
- Review date.
- Visibility.
- Last verification.
- Revision history.

Do not scrape or publish private conversations automatically.

## MOD-4 — Knowledge Freshness

Track review dates and known source changes.

Clearly indicate outdated or superseded information.

## SourceTrail

Link decisions and knowledge claims to their sources, assumptions, responsible people and review history.

## Link-16 — Trusted Source Card

A separate shareable card for a particular answer or recommendation with source, context and review status.

## ALT-10 — Evidence-Aware Recommendation Card

Separate personal experience from source-backed claims and independently verified results.

---

# PART 17 — COMMUNITY OWNER MODULES

Implement these distinct modules:

## Owner-1 — Group Activation

A guided journey that helps new members find the first relevant community action.

## Owner-2 — Community Knowledge Publisher

Structured publication and review of community knowledge.

## Owner-3 — Community Expert Exchange

A directory for experts, offers and appointment requests.

## Owner-4 — Community Outcome Analytics

Real calculations of requests, offers, tasks, participation and verified outcomes.

## Owner-6 — Member Recovery

Use authorized participation signals to identify possible inactivity trends and suggest helpful, opt-in engagement actions.

Do not use intrusive surveillance or infer sensitive reasons for inactivity.

## Owner-7 — GuildGrowth

Connect invitation sources, onboarding and first meaningful actions.

Do not optimize only for raw member counts.

## Owner-8 — Community Agent Kits

Reusable owner-configured workflows with permissions, human approval and audit logs.

## GroupEarn / Community Economy

Include only non-financial service discovery, volunteering, non-monetary recognition and scheduling.

Do not build financial transactions or cash payouts.

---

# PART 18 — MEMBER CROSS-COMMUNITY MODULES

Implement:

- User-1: Community Inbox.
- User-2: Portable Trust Profile.
- User-3: Personal Need & Opportunity Feed.
- User-4: Privacy and Consent Controls.
- User-5: Outcome Portfolio.
- Member Passport.
- Multi-community identity.
- Member matching based on declared skills and preferences.
- Portable contribution history.
- Community-specific preferences.

The member must choose which communities and records participate.

---

# PART 19 — DISCORD-SPECIFIC MODULES

Implement:

## DC-1 — GuildGrowth

Measure real onboarding and meaningful participation.

## DC-2 — QuestLoop

Tasks and challenges connected to actual outcomes.

## DC-3 — GuildTest

Test important connected Discord commands and workflows.

Track test versions, failures and regression outcomes.

Do not claim a real server test when only mocks were used.

## DC-4 — IntentReady

Convert expressions of interest into explicit actions.

## DC-5 — GuildPass

Shareable achievement or participation record tied to an authorized Discord server.

## DC-6 — AI Builder Pass

A version-specific, evidence-aware profile for AI tools and bots built by members.

Show genuine test evidence and limitations.

## DC-7 — GuildDrops

Non-monetary reward and recognition campaigns with eligibility and review rules.

All of these must use the same central backend and data records.

---

# PART 20 — TELEGRAM-SPECIFIC MODULES

Implement:

## TG-1 — Telegram Trust Network

Consent-based and source-attributed identity and outcome records for relevant providers or community participants.

Do not imply that identity verification guarantees service quality.

No payment verification.

## TG-2 — Telegram Community OS

A centralized operating workspace for connected groups and channels, with roles, onboarding, workflows, knowledge, tasks and integration health.

## TG-3 — ChannelFlow

Connect authorized channel posts to actionable requests, RSVPs, service offers, knowledge pages and task flows.

Do not assume access to all historical messages.

## TG-4 — MiniApp PartnerOS

Partner and campaign coordination with consent-based referrals and actual permitted attribution.

No commissions or payment processing.

## TG-5 — MiniApp TrustCheck

Version-specific functional and compatibility test reports for supported Telegram Mini Apps.

Do not claim independent security certification without a genuine certification.

## TG-6 — BotRelay

Permission-controlled event and workflow routing between authorized bots.

## TG-07 — MiniApp Context and Permissions Checker

Show exactly which Telegram data and actions are available for each launch context.

Do not assume direct Mini App links grant access to group messages.

## TG-08 — MiniApp TrustPass

A version-specific record of tested capabilities, permissions, limitations and real test evidence.

---

# PART 21 — REAL NOTIFICATIONS AND BOT ACTIONS

Build one shared notification engine.

Support:

- In-app notifications.
- Discord notifications.
- Telegram notifications.

Examples:

- New request.
- New offer.
- Offer accepted.
- Task assigned.
- Task deadline.
- Evidence submitted.
- Contribution review needed.
- Contribution verified.
- Contribution rejected.
- Appeal update.
- Event reminder.
- Knowledge update.

Each notification must have:

- A real source event.
- Correct recipient.
- Permission validation.
- User preference check.
- Delivery status.
- Duplicate protection.
- Safe retry mechanism.

Never mark an external notification delivered without a successful response from the actual messaging platform.

Never disclose private request details in a public group channel.

---

# PART 22 — ALL BUTTONS AND USER INTERACTIONS MUST WORK

This requirement applies to every page and every platform.

Audit every:

- Navigation item.
- Button.
- Form.
- Submit action.
- Cancel action.
- Modal.
- Tab.
- Filter.
- Search field.
- Pagination control.
- Dropdown.
- Checkbox.
- Switch.
- Copy-link button.
- QR code action.
- Share button.
- Link expiration action.
- Revoke action.
- Upload control.
- Evidence submission.
- Approval action.
- Rejection action.
- Appeal action.
- Identity linking action.
- Bot connection button.
- Test button.
- Dashboard card.
- Notification.
- Task checklist.
- Status update.
- Language switcher.
- Theme switcher.

For every interactive element:

1. Identify its intended action.
2. Verify the correct user has permission.
3. Execute the actual action.
4. Persist data when applicable.
5. Update the relevant UI.
6. Show a truthful success state.
7. Show a clear failure state when appropriate.
8. Prevent unintended duplicate actions.
9. Verify the result survives refresh or navigation.

A clickable appearance is not proof of functionality.

A button that only changes local frontend state without fulfilling its advertised business operation is not complete.

Remove or clearly disable nonimplemented actions rather than falsely advertising them.

---

# PART 23 — MAKE THE PLATFORM EASY FOR BOTH AUDIENCES

## Owner experience

The owner must be able to:

- Create a community.
- Connect the actual group/server.
- Verify the connection.
- Configure permissions.
- Publish action links.
- Manage requests and offers.
- Assign tasks.
- Approve contributions.
- Handle disputes.
- Publish knowledge.
- View real outcomes.
- Configure notifications.
- Manage bots.
- Inspect integration health.

## Member experience

The member must be able to:

- Join or access a community.
- Discover relevant actions.
- Request help.
- Offer help.
- Accept tasks.
- Follow task status.
- Submit evidence.
- Review decisions.
- Appeal when needed.
- Manage a Member Passport.
- Access a personal inbox.
- Discover opportunities.
- Share selected verified records.
- Control privacy.

Neither audience should be forced to use the other audience's workspace.

## Inside Discord and Telegram

Where supported and authorized:

- Members must invoke actions through commands, buttons and menus.
- Owners and moderators must access authorized administration functions.
- The bot must retrieve actual records.
- The bot must submit real actions.
- The backend must persist changes.
- The platform must show the same updated records.
- Notifications must be routed to the correct person and community.

The user must not need to navigate to a complex website for every simple action.

The web platform remains the destination for complex forms, evidence, detailed reviews, settings, profiles and reports.

---

# PART 24 — MOBILE, ARABIC AND ENGLISH UX

The project must be comfortable to use on mobile.

Implement:

- Responsive owner workspace.
- Responsive member workspace.
- Single-column layouts on narrow screens.
- Clear readable typography.
- Touch-friendly buttons.
- No horizontal overflow.
- Simplified navigation.
- Mobile-friendly forms.
- Readable tables or responsive card alternatives.
- Accessible dialogs.
- Clear loading and error messages.
- Mobile-friendly Community Links.

Support:

- Arabic RTL.
- English LTR.

Every route, form, modal, table, dropdown and navigation component must respect the selected direction.

Do not show raw technical messages such as `Permission Denied 403` to ordinary users.

Provide a friendly explanation while preserving diagnostic details in secure developer logs.

---

# PART 25 — DATABASE, DATA OWNERSHIP AND SECURITY

Use the actual central PostgreSQL database and the current project ORM architecture.

Implement or verify appropriate entities for:

- Users.
- Profiles.
- Member Passports.
- Skills.
- Communities.
- Memberships.
- Roles.
- Permissions.
- Platform Identities.
- Discord Server Connections.
- Telegram Group Connections.
- Requests.
- Offers.
- Matches.
- Expert Profiles.
- Polls.
- Decisions.
- Execution Plans.
- Tasks.
- Commitments.
- Handoffs.
- Events.
- Attendance.
- Contributions.
- Contribution Evidence.
- Contribution Reviews.
- Trust Attestations.
- Disputes.
- Appeals.
- Portable Records.
- Outcome Records.
- Knowledge.
- Knowledge Sources.
- Knowledge Versions.
- Community Links.
- Link Events.
- Attribution.
- Notifications.
- Notification Delivery.
- Integration Health.
- Bot Events.
- Audit Logs.
- Test Runs.

Verify:

- Foreign keys.
- Unique constraints.
- Tenant isolation.
- Proper indexes.
- Safe migrations.
- Transactions.
- Duplicate update prevention.
- Secure file access.
- Permission checks.
- Data retention and deletion policies.

Never expose one community's private data to another community by changing a URL or identifier.

Never put bot secrets in frontend code.

Never return credentials in API responses.

Never log secret values.

---

# PART 26 — LIVE INTEGRATION TRUTH

Provide separate integration health panels.

## Discord status must distinguish:

- Not configured.
- Credentials present.
- Authentication unverified.
- Authentication successful.
- Bot not installed.
- Bot installed.
- Permissions insufficient.
- Commands registered.
- Interactions tested.
- Connected.
- Disconnected.
- API unavailable.

## Telegram status must distinguish:

- Not configured.
- Credentials present.
- Authentication unverified.
- Authentication successful.
- Bot identity verified.
- Group not linked.
- Group linked.
- Permissions insufficient.
- Webhook not configured.
- Webhook configured.
- Polling active where applicable.
- Update handling tested.
- Connected.
- Disconnected.
- API unavailable.

Only update the status following actual API evidence.

Do not manufacture green connection indicators.

---

# PART 27 — USE THE APPLICATION AS AN ACTUAL USER

You must not test only through code inspection.

Act as the actual user of the available application preview and test environment.

Use the available browser, preview interaction and test tools provided by the development environment.

Create isolated test identities for:

1. Platform administrator.
2. Community owner.
3. Community moderator.
4. Regular member.
5. Expert or service provider.
6. Unauthenticated visitor.

These must be test identities isolated from production records.

## 27.1 Act as a community owner

Personally execute:

- Register or sign in.
- Create a community.
- Configure permissions.
- Open the Discord integration flow.
- Verify the authorized server connection where a real test server is available.
- Open the Telegram integration flow.
- Verify the authorized group connection where available.
- Create a Community Hub Link.
- Publish a request.
- Review offers.
- Assign a task.
- Review evidence.
- Approve or dispute a contribution.
- Publish a knowledge record.
- Inspect outcome analytics.
- Change link permissions.
- Revoke a link.
- Inspect integration health.

Do not merely describe these actions. Execute them in the application and inspect the results.

## 27.2 Act as an ordinary member

Personally execute:

- Register or sign in.
- Join a permitted community.
- Complete onboarding.
- Open the Member Space.
- Edit the Member Passport.
- Create a help request.
- Submit an offer.
- Accept a task.
- Update task progress.
- Submit evidence.
- View review results.
- Submit an appeal.
- View the Community Inbox.
- Explore the Opportunity Feed.
- Share one permitted contribution card.
- Revoke sharing where supported.
- Use the member's permitted bot commands.

Confirm every operation persists and displays correctly.

## 27.3 Act as an unauthorized visitor

Test:

- Access to private community records.
- Access to another member's private contribution.
- Access to owner-only routes.
- Use of expired links.
- Use of revoked links.
- Invalid sharing tokens.
- Unauthorized bot actions.
- Identity-linking attempts by the wrong account.

All unauthorized operations must be denied without leaking protected data.

## 27.4 Test the actual messaging surfaces

When real authorized test Discord and Telegram communities are available:

- Install the bot.
- Invoke actual commands.
- Use the bot's interactive controls.
- Create actual test actions.
- Confirm backend persistence.
- Confirm owner workspace visibility.
- Confirm member workspace visibility.
- Confirm notification delivery.
- Confirm correct status updates.

Use the actual platform clients or available browser automation.

Do not replace these tests with mock responses and call them live tests.

If a real server/group must be added by the owner, explain the exact manual step required. Never claim that you installed a bot into a server you cannot access.

---

# PART 28 — THREE INDEPENDENT VERIFICATION ROUNDS

Perform three genuinely different quality rounds, not three repetitions of the same build command.

## ROUND 1 — IMPLEMENTATION AND PERSISTENCE

Verify each feature through its actual user interface and backend.

Check:

- Correct UI.
- Correct form validation.
- Correct permission.
- Correct backend action.
- Database persistence.
- Correct state after refresh.

## ROUND 2 — ADVERSARIAL AND CROSS-ROLE TESTING

Test:

- Owner versus member permissions.
- Cross-community boundaries.
- Invalid identifiers.
- Expired and revoked links.
- Duplicate submissions.
- Repeated webhook updates.
- Failed API calls.
- Insufficient permissions.
- Disconnected bots.
- Missing configuration.
- Incorrect status transitions.
- Private evidence access.

## ROUND 3 — FULL END-TO-END AND REGRESSION

Run complete journeys:

A. Owner creates and connects a community.

B. Member creates a request.

C. Another member submits an offer.

D. Owner accepts the offer.

E. A task is created and assigned.

F. The helper completes the work.

G. Evidence is submitted.

H. Contribution is reviewed and verified or disputed.

I. The outcome appears in the correct dashboards.

J. The member shares a selected portable contribution.

K. The owner shares an outcome card.

L. Relevant Discord and Telegram interactions retrieve or update the same records.

After the last code change, execute the relevant regression tests again.

Do not mark a test passed unless the expected result was actually observed.

---

# PART 29 — STOP THE INFINITE FIX PROBLEM LOOP

Do not create another endless repair cycle.

For every error:

1. Capture the actual error.
2. Locate its root cause.
3. Identify related errors.
4. Apply the smallest correct fix.
5. Run the relevant test.
6. Verify the result.
7. Mark the issue as fixed only when evidence supports that status.

If the same root-cause error persists after three unsuccessful repair approaches:

- Stop repeating the same change.
- Inspect environment limitations.
- Inspect dependencies and configuration.
- Check whether the fix was actually applied.
- Check whether a different failure is being confused with the original one.
- Diagnose from the source again.

Never disable type safety, remove tests, fake success, or rewrite stable files merely to silence a warning.

Keep a documented issue ledger.

Once an issue is verified, do not reopen it without new evidence.

---

# PART 30 — FINAL DELIVERABLE AND COMPLETION EVIDENCE

Provide a factual report when implementation and verification are complete.

It must include:

## A. Community OS functionality

List every implemented module and its actual status.

## B. Owner Workspace

Show which owner actions genuinely work.

## C. Member Workspace

Show which member actions genuinely work.

## D. Discord

Report:

- Actual authentication result.
- Actual bot identity.
- Server installation state.
- Server/community mapping.
- Permissions.
- Registered commands.
- Actual command tests.
- Shared database actions.
- Remaining external requirements.

## E. Telegram

Report:

- Actual authentication result.
- Actual bot identity.
- Group/community mapping.
- Webhook or polling state.
- Commands.
- Actual test actions.
- Shared database actions.
- Remaining external requirements.

## F. No-fake-data audit

List the source of each dashboard metric and confirm whether it is backed by real data or labeled test data.

## G. User testing

Report the actual owner, member and visitor journeys executed.

## H. Buttons and actions

Report interactive elements tested and any remaining nonfunctional action.

## I. Security and privacy

Report actual authorization and tenant-isolation test results.

## J. Remaining issues

Name every unresolved issue and its exact cause.

## K. Test evidence

Give actual commands, actual output summaries, test counts where supplied by the test runner, failures, fixes and final regression results.

Do not invent a passing percentage.

Do not claim zero possible defects.

Do not claim an external bot integration works if only local mocks passed.

---

# FINAL EXECUTION ORDER

Start by inspecting the existing Community OS project, its database, current screens, buttons, test fixtures and integration configuration.

Preserve working code and current useful UI.

Audit all visible example metrics and records before presenting them as genuine.

Then complete the owner workspace, member workspace, shared workflows, links, permissions, integrations, bot actions and final testing.

Do not start by generating a decorative redesign.

Do not stop at the dashboard.

Do not stop after creating the database tables.

Do not stop after connecting the bot token.

Do not stop after a successful build.

**The owner must be able to connect their own real community and manage it. The member must have their own complete area. Both must be able to use the supported functionality from the web platform and from inside the actual Discord server or Telegram group through the authorized bots.**

**Every button must perform its real advertised function. Every number must have an actual source. Every integration status must reflect a real verified state. Every contribution and outcome must follow its actual review process. Every user journey must be tested.**

Complete the full scope without payment features, without fabricated metrics, without simulated production success and without endless speculative repair cycles.

The required final result is a genuinely operational Community OS platform, not a dashboard that merely looks operational.