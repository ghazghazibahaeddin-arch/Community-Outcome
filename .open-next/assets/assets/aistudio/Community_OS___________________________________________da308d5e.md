# MISSION: REPAIR, COMPLETE, AND VERIFY COMMUNITY OS

You are the lead software engineer, security engineer, QA engineer, and product engineer responsible for the existing Community OS (Community Outcome OS) project.

Your mission is to inspect the ACTUAL EXISTING CODEBASE, identify why essential functionality is missing or broken, implement the missing functionality, fix existing defects, and verify the result using real application behavior.

This is an implementation task, not a planning exercise, UI redesign exercise, or report-writing exercise.

## 1. NON-NEGOTIABLE RULES

1. Inspect the existing source code, routes, components, database models, authentication implementation, environment variables, API handlers, Discord integration, Telegram integration, and tests before deciding what to change.
2. Preserve working functionality. Do not unnecessarily rebuild or destroy the existing project.
3. Do not merely describe fixes. Make the actual code changes.
4. Do not claim a feature works because a button, page, route, API handler, mock response, or placeholder exists.
5. Never fabricate users, communities, members, requests, offers, contributions, outcomes, analytics, integration statuses, verification results, or test results.
6. Never present seeded demonstration records as real production records.
7. Never report a successful test unless it was actually executed and its result was observed.
8. Never use simulated Discord or Telegram commands as evidence that the production bot works inside a real server or group.
9. Do not create fake success notifications or fake connection indicators.
10. Do not replace a failing test with a weaker test merely to make the test suite pass.
11. Do not silently disable failing features, remove important functionality, or weaken security checks to obtain a successful build.
12. Do not stop after finding the first error. Continue through the entire project and repair all issues that can be reliably identified and fixed within the available environment.
13. Do not enter an endless cycle of repeatedly attempting broad automatic fixes. Work in controlled stages, identify root causes, make targeted changes, and rerun relevant tests.
14. Do not finish by writing a success summary while known critical defects remain.
15. If a task genuinely requires external credentials, an inaccessible service, deployment, or manual action by the owner, implement everything possible and clearly identify the remaining dependency. Never pretend that the unavailable operation succeeded.

The existing project previously produced a report claiming that 12 end-to-end journeys passed, but actual usage revealed missing authentication, nonfunctional features, fabricated or unexplained data, inadequate role switching, and Discord/Telegram bots that could not be invoked successfully in real communities.

Treat every previous success claim as UNVERIFIED until independently demonstrated.

---

# 2. FIRST: AUDIT THE ACTUAL PROJECT

Inspect the entire project and produce an internal implementation checklist.

Identify:

- The framework and application entry points.
- All existing pages, navigation items, and buttons.
- All API endpoints and server actions.
- All database models, schemas, migrations, and persistence mechanisms.
- Whether authentication is real or merely simulated.
- Whether authorization is enforced on the server.
- Whether the application uses real database records or hardcoded arrays and objects.
- Whether the owner and member workspaces are actually implemented.
- Whether role changes persist and are authorized.
- Whether Discord commands are registered and handled correctly.
- Whether Telegram webhook updates are received and processed correctly.
- Whether Community Links perform real actions.
- Whether requests, offers, tasks, evidence, contributions, confirmations, disputes, and outcome records persist.
- Whether the application can be built and deployed in its current environment.
- Which features are incomplete, broken, inaccessible, or only visually implemented.

Search for fake data, placeholder handlers, hardcoded success messages, mock integrations, static dashboards, temporary user identities, and buttons without working actions.

Do not assume that an existing route or component has a working backend.

Create a defect inventory organized by severity:

- P0: security vulnerabilities, unauthorized access, account takeover, cross-community data leakage, exposed secrets.
- P1: authentication failures, broken core workflows, unusable bots, data loss, broken permissions.
- P2: incomplete product features, incorrect statistics, broken navigation, failed notifications.
- P3: visual inconsistencies, accessibility problems, and minor usability defects.

Fix critical and high-severity defects first, then continue through the remaining defects.

---

# 3. IMPLEMENT REAL USER AUTHENTICATION

The application must provide an actual authentication experience.

Create and test these pages and workflows:

- Sign up.
- Sign in.
- Sign out.
- Forgot password.
- Password reset.
- Email verification when supported by the configured authentication system.
- Session persistence and expiration.
- Protected account pages.
- Appropriate unauthorized and expired-session handling.

## Forgot Password

The login page must contain a visible, accessible “Forgot password?” link.

The workflow must:

1. Allow a user to enter their registered email address.
2. Generate a cryptographically secure, single-use, time-limited reset token.
3. Send a real reset email through a configured email delivery service.
4. Verify the token securely on the server.
5. Allow the user to set a new password.
6. Invalidate the reset token after successful use.
7. Prevent reuse of expired or consumed tokens.
8. Invalidate or appropriately rotate existing sessions after a password change.
9. Avoid revealing whether an email address has a registered account.
10. Apply reasonable rate limits to prevent abuse.

Never show “Password reset email sent” as proof of delivery unless the email provider actually accepted the send request. Distinguish an email provider accepting a message from confirmed delivery.

If no email provider is configured, display a clear setup requirement and provide a safe development-only testing mechanism. Do not silently pretend password recovery is functional.

Do not log passwords, reset tokens, session tokens, or secrets.

Use secure password hashing and appropriate session protections. Do not implement custom cryptography when a reliable authentication framework or library is already available.

If the current architecture supports a reputable authentication provider, evaluate whether it is appropriate before building an insecure custom alternative.

---

# 4. IMPLEMENT CORRECT ACCOUNT, MEMBERSHIP, AND ROLE LOGIC

There must be a clear distinction between:

- A registered user account.
- A community.
- Membership in a community.
- A role assigned within that community.
- Global platform administration, if present.

One account must be able to participate in multiple communities.

The same user may be:

- An ordinary member in Community A.
- An owner in Community B.
- A moderator in Community C.
- A contributor in Community D.

Implement two clear workspaces:

## A. Member Workspace

A real authenticated member must be able to:

- View and edit their own profile.
- Manage their skills and interests.
- Discover authorized community opportunities.
- Submit a request for help.
- Browse eligible requests.
- Submit an offer to help.
- Accept assignments when authorized.
- View assigned tasks and milestones.
- Update task progress.
- Submit genuine evidence of completed work.
- Confirm or dispute a contribution when appropriate.
- View their actual contribution history.
- Manage their Member Passport.
- Manage portable contribution records and sharing consent.
- Receive relevant notifications.
- Control privacy settings.
- View their actual activity and outcomes.

All operations must use the authenticated user's identity. Users must not be able to edit another user's private information or contribution records without explicit authorization.

## B. Community Owner Workspace

A genuine community owner must be able to:

- Create a community in Community OS.
- Edit its name, description, category, and settings.
- Connect a real Discord server or Telegram group.
- Manage community membership and permissions.
- Configure requests, offers, tasks, events, and contribution rules.
- Review incoming requests and offers.
- Assign contributors where authorized.
- Review evidence and contribution submissions.
- Approve or reject submissions with reasons.
- Handle disputes and appeals.
- Manage Community Links.
- Review real community analytics.
- Configure notifications.
- View actual activity and verified outcomes.

A user must not be able to claim ownership of an existing community simply by changing a dropdown.

## Role switching

Remove any production functionality that allows a user to impersonate arbitrary users through a Persona Switcher.

Remove or disable production-only access to demo identities such as:

- Sarah Al-Mansoor.
- Alex Chen.
- Tariq Nour.
- Maya Lin.
- Guest.

These identities may exist only in an explicitly isolated demo environment.

Implement legitimate context switching between communities and workspaces based on actual authenticated identity and persisted membership permissions.

Provide an owner onboarding flow so an ordinary registered member can create their own new community and become its initial owner.

If an existing community requires ownership transfer, implement a secure, authorized transfer process with confirmation and an audit trail.

Never allow users to grant themselves owner, moderator, reviewer, or administrator privileges by modifying frontend state or calling an API directly.

Every sensitive permission must be checked server-side.

---

# 5. ELIMINATE FABRICATED DATA

Audit every dashboard, chart, counter, list, activity feed, profile, community card, and analytics panel.

Production data must come from real persisted records.

Do not use hardcoded values such as:

- 1,420 members.
- Fake completion percentages.
- Fake average response times.
- Fake verified contributions.
- Fake active contributors.
- Fake connected communities.
- Fake Discord or Telegram connection states.
- Fake review results.
- Fake activity histories.
- Fake success notifications.

The numbers above are examples of values that must never appear as production facts without actual supporting records.

Implement the following rules:

1. Empty database means zero records, not sample records.
2. Empty charts must display a proper empty state.
3. Loading states must be distinct from empty states and errors.
4. Failed queries must display an error state, not fabricated data.
5. Analytics must be computed from real records and defined calculation rules.
6. Demo data must be explicitly labeled DEMO and must never contaminate production data.
7. Production must not be populated with test identities or seed fixtures.
8. Integration status must come from a real health check.
9. A bot token being present does not automatically mean that the bot is connected to a community.
10. A successful HTTP response does not automatically mean that a business workflow completed successfully.

Use a single clearly defined production/demo environment configuration. Do not implement a production mode switch that secretly deletes or fabricates records.

Never expose destructive reset functionality to ordinary community owners.

---

# 6. MAKE DISCORD INTEGRATION ACTUALLY WORK

Audit the actual Discord integration, including:

- Discord application configuration.
- Bot token usage.
- Application ID and public key configuration.
- OAuth2 installation flow where required.
- Guild installation and authorization.
- Slash-command registration.
- Interaction endpoint.
- Request signature verification.
- Response timing requirements.
- Command handlers.
- Permissions.
- Community-to-guild mapping.
- User identity linking.
- Error handling.
- Deployment and public endpoint requirements.

Use the official Discord integration architecture appropriate to the existing project.

If using HTTP interactions, validate Discord request signatures against the actual raw request body using the configured application public key. Implement correct handling of Discord PING requests and application commands. Respect Discord's interaction acknowledgement requirements and response deadlines.

If using the Gateway architecture, correctly initialize the client, configure only the necessary intents, handle reconnects, and avoid duplicate event processing.

Do not mix HTTP interaction handling and Gateway assumptions incorrectly.

## Required user experience

An owner must be able to:

1. Open the integration setup page.
2. Connect or install the bot into a server they are authorized to manage.
3. Follow a clear installation flow.
4. See whether installation and authorization succeeded.
5. Link the correct Discord server to the correct Community OS community.
6. Test the integration using a real Discord interaction.
7. See understandable error messages if setup fails.

A Discord server member must be able to invoke the available bot commands inside the actual server.

Implement the necessary command registration and command handlers for supported features, including appropriate equivalents of:

- `/help`
- `/hub`
- `/requests`
- `/help-request`
- `/offer`
- `/tasks`
- `/mytasks`
- `/passport`
- `/contribution`
- `/connect`
- `/status`

Adapt command names to Discord's actual command rules.

Do not implement a command that advertises functionality that does not exist.

Commands must use the actual Discord guild ID and authenticated Discord user ID. They must resolve the correct community and permissions before reading or modifying data.

When an operation needs a longer workflow, return a properly acknowledged response and a secure link to the corresponding Community OS page.

For sensitive operations, require appropriate authentication or identity linking. Do not trust an arbitrary Discord username as proof of a Community OS account identity.

Use minimal Discord permissions. Never request Administrator permission when narrower permissions are sufficient.

If an installation URL is needed, generate it using the actual application ID and required scopes and permissions. Do not invent the ID or installation result.

---

# 7. MAKE TELEGRAM INTEGRATION ACTUALLY WORK

Audit the real Telegram bot configuration, token, webhook, update handling, command registration, group permissions, identity linking, and community mapping.

Implement correct Telegram webhook validation using the configured secret token where supported.

Verify that incoming updates are handled safely, that duplicate updates are idempotent, and that failures are logged without exposing secrets.

If the webhook is not configured, show the actual setup steps and status. Do not claim the bot is live.

Provide a practical owner setup flow that helps the owner:

1. Add the real bot to their Telegram group.
2. Grant only the permissions necessary for supported features.
3. Configure the webhook using a publicly reachable HTTPS endpoint where required.
4. Associate the correct Telegram group with the correct Community OS community.
5. Verify connectivity with a genuine Telegram API check.
6. Run a real command inside the group.
7. Understand any missing configuration or permissions.

Implement real handlers for supported commands, including appropriate equivalents of:

- `/start`
- `/help`
- `/hub`
- `/requests`
- `/help_request`
- `/offer`
- `/tasks`
- `/mytasks`
- `/passport`
- `/contribution`
- `/connect`
- `/status`

Use valid Telegram command naming and supported interaction formats.

The commands must perform genuine actions using persisted application data.

Account linking must use a secure verification challenge with an expiry, single-use validation, and server-side checks. Do not automatically assume that a Telegram username matches a registered account.

Respect Telegram privacy mode and group limitations. Do not claim that the bot can read every message in a group unless the actual configuration and Telegram permissions allow it.

Where a Telegram Mini App is used, validate its initialization data cryptographically on the server and reject forged or expired data.

Never trust user IDs, group IDs, roles, or permissions supplied by an untrusted frontend.

---

# 8. MAKE BOTH BOTS USE THE SAME REAL APPLICATION ENGINE

Discord and Telegram must not contain independent, inconsistent implementations of the product.

Build or repair a shared backend service layer used by:

- The web application.
- The Discord bot.
- The Telegram bot.
- Community Link pages.

The shared layer must enforce authentication, authorization, validation, tenant isolation, persistence, and audit logging.

A request created in Telegram must appear in the appropriate Community OS community if the operation succeeds.

An authorized owner must be able to review that request in the web application.

A member's offer submitted through Discord must persist and be visible to the correct users.

Task assignments, evidence, approvals, disputes, and contribution records must remain consistent across channels.

Use transactions where appropriate, idempotency for retried operations, and proper error handling.

Never return a success message before the operation has actually succeeded.

If a database write fails, return an accurate error rather than pretending that the request, offer, or contribution was saved.

---

# 9. COMPLETE THE ACTUAL PRODUCT WORKFLOWS

Audit, implement, and test every existing product module.

Do not limit the repair to the login screen.

## Community Hub

- Create and edit a community.
- Display real community information.
- Show genuine linked Discord and Telegram destinations.
- Provide actions according to the viewer's permissions.
- Display accurate empty, loading, and error states.

## NeedSignal — Requests and Offers

- Create a request.
- Validate required fields.
- Persist the request.
- Browse authorized requests.
- Submit offers.
- Review offers.
- Accept or reject an offer.
- Prevent unauthorized changes.
- Track genuine status changes.
- Record an appropriate audit trail.

## QuestLoop — Tasks and Milestones

- Create tasks from authorized requests or independently where supported.
- Assign tasks.
- Track milestone completion.
- Record progress changes.
- Submit evidence.
- Prevent unauthorized task updates.
- Preserve task history.

## Contribution Ledger

- Create contribution records from actual eligible actions.
- Attach evidence.
- Track review status.
- Approve or reject with reasons.
- Require the appropriate confirmations.
- Support disputes and corrections.
- Preserve provenance and audit history.
- Prevent duplicate or fabricated verification.

## Trust and Fairness

- Apply explicit verification rules.
- Record the identity of actual reviewers.
- Provide reasons for rejection.
- Support dispute and appeal workflows.
- Prevent an administrator from silently rewriting a member's history.
- Keep all actions authorized and auditable.

## Member Passport and Portable Records

- Distinguish self-declared skills from verified contributions.
- Show only records belonging to the authenticated user or otherwise explicitly shared with the viewer.
- Require consent before sharing records with another community.
- Support revocation where applicable.
- Preserve the source community and verification status.
- Never create a verified record simply because a user entered text into a form.

## Community Wins

Generate outcome cards only from actual eligible outcome records.

A card must link to the real underlying record or an authorized public representation.

Respect record visibility, consent, and revocation.

Do not manufacture success stories or outcome statistics.

## Community Links

Every generated link must have a defined action.

Implement and verify:

- Community Hub Link.
- Help Request Link.
- Offer Link.
- Task Link.
- Event Link.
- Contribution Submission Link.
- Contribution Confirmation Link.
- Portable Record Link.
- Outcome Card Link.
- Knowledge Link.
- Bounty Link, if supported without payments.
- Community Join Link.
- Multi-Community Help Link.
- Issue Report Link.
- Referral Link.

Where applicable, support:

- Permission rules.
- Expiration.
- Revocation.
- Secure, unpredictable tokens.
- Correct community attribution.
- Real action and completion tracking.
- Privacy controls.
- Appropriate login requirements.

A link click is not a completed request. A completed request is not automatically a verified outcome. Track each stage separately.

## Knowledge and Sources

- Create and edit knowledge entries.
- Store source references.
- Preserve attribution.
- Validate required fields.
- Support appropriate review and version history.
- Avoid invented sources or claims of verification.

## Notifications and Inbox

- Generate notifications from real application events.
- Show them to the correct recipients.
- Track read/unread status where implemented.
- Handle delivery failures.
- Do not fabricate notifications.

## Community Analytics

Calculate analytics from real persisted events and records.

Document what each metric means and how it is calculated.

Do not show a positive result when the actual count is zero or unavailable.

---

# 10. IMPLEMENT A REAL AND SAFE DATABASE MODEL

Inspect the existing database and make necessary migrations.

Use the existing supported database architecture unless a concrete technical defect requires a justified change.

Persist all essential records, including the applicable entities for:

- Users.
- Authentication identities and sessions.
- Password-reset tokens.
- User profiles.
- Communities.
- Memberships.
- Community roles and permissions.
- Platform connections.
- Discord guild mappings.
- Telegram group mappings.
- Requests.
- Offers.
- Tasks.
- Milestones.
- Evidence.
- Contributions.
- Reviews and confirmations.
- Disputes and appeals.
- Portable records.
- Outcome cards.
- Community Links.
- Link events.
- Knowledge entries and sources.
- Notifications.
- Audit logs.

Use appropriate database constraints, indexes, foreign keys, and migrations.

Do not add a new database layer unnecessarily if a valid one already exists.

Every database query involving private community information must be scoped to the authorized community and user context.

Test cross-community isolation explicitly.

Prevent one community owner from accessing another community's private records unless a defined, consent-based sharing workflow authorizes it.

Do not rely solely on frontend filters for tenant isolation.

---

# 11. SECURITY AND SECRETS

Review:

- Authentication and authorization.
- Session security.
- Password reset.
- Input validation.
- Output encoding.
- CSRF protection where relevant.
- Rate limiting.
- API abuse prevention.
- Webhook signature validation.
- Telegram webhook secret validation.
- Discord request verification.
- SQL injection risks.
- Cross-site scripting risks.
- Tenant isolation.
- Sensitive logs.
- Dependency vulnerabilities.
- Production error handling.

Never expose bot tokens, reset tokens, private keys, database credentials, or server secrets to browser code.

Ensure secrets are read only in the appropriate server environment.

Use the existing environment variable names where possible. If changes are necessary, update the environment example and explain the required configuration.

Never print actual secret values in reports, pages, or logs.

Do not change valid credentials merely to hide a configuration problem.

If a credential is missing or invalid, show a safe and precise configuration error.

---

# 12. USER EXPERIENCE REQUIREMENTS

The application must be usable on mobile and desktop.

The user interface must provide:

- Clear navigation.
- Distinct member and owner workspaces.
- An understandable community selector.
- Accessible forms.
- Field-level validation.
- Loading indicators.
- Empty states.
- Error states.
- Success states shown only after actual success.
- Confirmation before destructive operations.
- Helpful permission-denied messages.
- Working back navigation.
- No dead buttons.
- No fake modal dialogs.
- No broken links.
- No hidden core functionality that can only be reached by manipulating the URL.
- Proper Arabic RTL and English LTR layouts.

The signup and login screens must be discoverable from the public landing page.

A visitor must understand how to create an account, join a community, or create a community.

A member must understand how to submit a request or offer help.

An owner must understand how to configure a community, connect a bot, and review outcomes.

Do not make the owner manually edit source code to perform routine product operations.

Do not claim that the interface is fully translated if key pages or errors remain untranslated.

---

# 13. REAL END-TO-END TESTING — NOT JUST A REPORT

After implementation, execute a structured test plan.

Do not mark a test as passed merely because a test file exists.

## Test Pass 1 — Static and Build Checks

Run the available:

- Production build.
- Type checking.
- Linter.
- Unit tests.
- Database schema validation.
- Migration checks.
- Dependency and configuration checks.

Fix errors caused by the project before proceeding.

Do not claim that a command passed unless you actually ran it.

## Test Pass 2 — Application and API Tests

Test actual routes and handlers, including:

- Signup.
- Login.
- Logout.
- Forgot password.
- Reset password.
- Unauthorized access.
- Invalid input.
- Role permissions.
- Community creation.
- Request creation.
- Offer submission.
- Task assignment.
- Evidence submission.
- Contribution review.
- Disputes.
- Portable record sharing.
- Link expiration and revocation.
- Notification generation.
- Analytics calculations.
- Database persistence.
- Cross-tenant isolation.

Use an isolated test database and test identities. Never pollute production with test records.

## Test Pass 3 — End-to-End Browser Tests

Use the browser or test automation available in the environment.

Test complete journeys, not isolated page rendering.

At minimum:

**Journey A — New Member**
1. Open the application.
2. Register an account.
3. Complete any required verification.
4. Sign in.
5. Edit the profile.
6. Browse a real community.
7. Submit a request or offer.
8. Refresh the page.
9. Verify that the saved record persists.

**Journey B — New Community Owner**
1. Register or sign in.
2. Create a community.
3. Confirm that the current user becomes its owner.
4. Open the owner workspace.
5. Configure the community.
6. Generate a Community Hub Link.
7. Open that link as an authorized and an unauthorized visitor.
8. Confirm correct access behavior.
9. Create a request.
10. Review an offer.
11. Assign a task.
12. Review submitted evidence.
13. Confirm the correct outcome behavior.

**Journey C — Role and Workspace Switching**
1. Use one authenticated account.
2. Open a community where the user is a member.
3. Open another community where the same user is an owner.
4. Switch community context.
5. Confirm that each workspace displays the correct permissions.
6. Attempt unauthorized owner actions as a member.
7. Confirm that the server rejects them.

**Journey D — Password Recovery**
1. Request a password reset.
2. Verify the actual development or configured email delivery behavior.
3. Reset the password using a valid token.
4. Attempt to reuse the token.
5. Attempt to use an expired or invalid token.
6. Sign in using the new password.
7. Verify that the old password no longer works.

**Journey E — Complete Contribution Workflow**
1. Create a genuine request.
2. Submit an offer.
3. Accept the offer.
4. Create or assign the task.
5. Submit evidence.
6. Review the evidence.
7. Obtain the required confirmations.
8. Create the eligible contribution record.
9. Verify its actual status and provenance.
10. Create a shareable outcome card only if the requirements are met.

**Journey F — Data Integrity**
1. Start with an empty test database.
2. Verify that all relevant counts are zero.
3. Create a known number of records.
4. Verify that the counts match those records.
5. Verify that deleting or changing a record updates relevant metrics correctly.
6. Confirm that errors do not create false success states.

## Test Pass 4 — Real Platform Integration

Verify Discord and Telegram separately.

For Discord, distinguish:
- Bot token validity.
- Application endpoint validity.
- Command registration.
- Server installation.
- Real interaction delivery.
- Correct response.
- Successful business operation.
- Correct database persistence.

For Telegram, distinguish:
- Bot token validity.
- Webhook configuration.
- Actual webhook delivery.
- Command handling.
- Group permissions.
- Correct group mapping.
- Successful business operation.
- Correct database persistence.

When credentials and deployment are available, run actual API checks and real interactions in a controlled test server and group.

When real credentials, a public endpoint, or a human-controlled installation step are unavailable, do not mark those tests as passed. State exactly which test is blocked and what must be done to complete it.

A simulated test may be reported as a simulated test, but it must never be presented as proof of real platform functionality.

## Test Pass 5 — Regression and Security

Repeat relevant tests after fixes.

Test:

- Invalid sessions.
- Unauthorized roles.
- Cross-community access attempts.
- Duplicate webhook deliveries.
- Invalid webhook signatures.
- Expired links.
- Revoked links.
- Invalid password-reset tokens.
- Repeated form submissions.
- Database failures.
- API timeouts.
- Missing environment variables.
- Empty states.
- Mobile navigation.
- Arabic RTL and English LTR.

Re-run the production build and relevant tests after the final code change.

If the final change causes a failure, fix it and rerun the affected tests.

Do not use an arbitrary claim such as “tested three times” as proof. Report the actual tests, commands, results, and limitations.

---

# 14. DO NOT ENTER AN ENDLESS AUTOMATIC FIX LOOP

Use this controlled process:

PHASE 1: Inspect and map the existing codebase.

PHASE 2: Identify defects and their root causes.

PHASE 3: Fix authentication, account model, permissions, and data integrity.

PHASE 4: Fix the core web workflows.

PHASE 5: Fix the shared backend and Community Link workflows.

PHASE 6: Fix Discord integration.

PHASE 7: Fix Telegram integration.

PHASE 8: Run tests and fix regressions.

PHASE 9: Run final verification and report only observed results.

After each phase:

1. Make a focused set of changes.
2. Run the relevant checks.
3. Inspect the failures.
4. Fix root causes instead of adding superficial workarounds.
5. Continue to the next phase once the phase is stable.

Do not repeatedly rewrite the entire project in response to one localized error.

Do not stop after making the build pass if the actual product workflows are still broken.

---

# 15. REQUIRED FINAL DELIVERABLE

When the work is complete, provide a concise but evidence-based report containing:

## A. Actual changes
List the files, routes, database changes, and integrations modified.

## B. Authentication
State whether signup, login, logout, forgot password, and password reset were actually implemented and tested.

## C. Role system
Explain how one account can be a member in one community and an owner in another. Confirm whether unauthorized role escalation was tested.

## D. Product functionality
List which core features were tested successfully and which remain incomplete.

## E. Discord
Report the actual bot and command tests performed. Separate token validation from successful real-server interactions.

## F. Telegram
Report the actual webhook, command, and real-group tests performed. Separate API reachability from successful group workflows.

## G. Data integrity
Explain how fabricated production data was removed or isolated and how dashboard numbers are calculated.

## H. Build and test results
Include the actual commands or test procedures executed and their observed results.

## I. Remaining blockers
List any missing credentials, external configuration, deployment requirements, or manual installation steps.

## J. Honest completion status
Use only one of these statuses:

- VERIFIED: The specified functionality was implemented and the corresponding real test passed.
- IMPLEMENTED, NOT VERIFIED: The code exists but the required test could not be completed.
- BLOCKED: An external dependency or missing prerequisite prevents completion.
- NOT IMPLEMENTED: The functionality is still missing.
- FAILED: The attempted test ran and failed.

Never label the entire product “complete” merely because the build succeeds.

---

# FINAL INSTRUCTION

Start by inspecting the existing source code and implementing the highest-priority missing functionality.

Do not answer with a plan alone.

Do not return another self-congratulatory engineering summary.

Do not claim that all features work without evidence.

Make real code changes, test them, repair the failures you can reproduce, and continue until every feasible requirement above has been implemented and verified.

If a requirement cannot be completed in the current environment, explain the exact blocker instead of fabricating success.

The objective is a usable Community OS product with genuine accounts, correct member and owner workspaces, persistent data, functional business workflows, and real Discord and Telegram integrations — not merely a convincing demo.