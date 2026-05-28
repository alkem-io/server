# PRD — Notifications: Email-Change Notification Events

**Component**: `alkemio/notifications` (the `@alkemio/notifications-lib` package + the `alkemio-notifications` service)
**Parent feature**: server spec [097-change-user-email](./spec.md)
**Status**: Draft — ready for notifications-service scoping
**Depends on**: server spec 097 (merged — publishes the four events below)

---

## 1. Problem & goal

Server spec 097 added a platform-admin email-change flow. On a successful
commit (and on a drift-detected fault) the server **publishes four new
notification events** to RabbitMQ. The `alkemio-notifications` service does not
recognise them — it currently logs and negative-acknowledges each one:

```
WARN [Server] An unsupported event was received. It has been negative
acknowledged, so it will not be re-delivered. Pattern: USER_EMAIL_CHANGE_SECURITY_SIGNAL
```

As a result **no email is delivered** when an admin changes a user's login
email. The server publishes all four events today; this PRD covers the
**notifications side** that turns those events into delivered notifications.
The server already resolves recipients for the two admin fan-out events
(§2.3, §2.4) — it embeds a server-resolved recipient list in each payload, so
no further server work is required.

**Goal**: deliver four email-change notifications —
1. a **security signal** to the user's **old** address,
2. an **acknowledgement** to the user's **new** address,
3. a **fan-out** to platform administrators,
4. a **per-space fan-out** to the admins / leads of every space the subject
   is a member of —

so that an email change is communicated to the affected user, to platform
staff, and to the administrators of every space the user belongs to.

---

## 2. The four events (published by the server today)

The server emits these via the existing RabbitMQ notifications exchange. Each
`NotificationEvent` value and its wire payload:

### 2.1 `USER_EMAIL_CHANGE_SECURITY_SIGNAL` → the OLD address

Sent so a user (or a now-hostile party at a lost mailbox) is alerted that the
login email was changed. The new address is **masked**.

```ts
interface UserEmailChangeSecuritySignalPayload {
  recipientEmail: string;        // the OLD address — deliver here
  commitTimestampISO8601: string;
  initiatorRole: 'self' | 'platform_admin';
  newEmailMasked: string;        // e.g. "e***@c***.bg" — render as-is, do NOT unmask
}
```

### 2.2 `USER_EMAIL_CHANGE_NEW_ADDRESS_NOTIFICATION` → the NEW address

Acknowledges to the legitimate new-mailbox holder that this address is now their
Alkemio login. The new address is shown **in full** (the recipient owns it).

```ts
interface UserEmailChangeNewAddressNotificationPayload {
  recipientEmail: string;        // the NEW address — deliver here
  commitTimestampISO8601: string;
  initiatorRole: 'self' | 'platform_admin';
  newEmailFull: string;
  loginUrl: string;              // client-web login deep link
}
```

### 2.3 `USER_EMAIL_CHANGE_GLOBAL_ADMIN_NOTIFICATION` → platform administrators

A fan-out so platform staff are aware of (and can assist with) email changes,
including the drift-detected case. Recipients are **resolved on the server** at
publish time and embedded in the payload — exactly as
`PLATFORM_ADMIN_GLOBAL_ROLE_CHANGED` does — so this event flows through the
notifications service's standard recipient pipeline with no special handling.

```ts
interface UserEmailChangeGlobalAdminNotificationPayload extends BaseEventPayload {
  // BaseEventPayload supplies eventType, triggeredBy, platform, and
  // recipients: UserPayload[] — the server-resolved platform-admin set.
  subjectProfileSummary: { id: string; displayName: string };
  oldEmail: string;              // full — admin recipients are trusted
  newEmail: string;              // full
  initiatorProfileSummary?: { id: string; displayName: string };
  initiatorRole: 'self' | 'platform_admin';
  commitTimestampISO8601: string;
  triggerOutcome: 'COMMITTED' | 'DRIFT_DETECTED';
  // Optional context for the admin email body — NOT recipient-resolution
  // inputs. MAY be omitted if the template does not surface them.
  subjectMemberships?: {
    spaces: { spaceId: string; level: string; roles: string[] }[];
    organizations: { organizationId: string; roles: string[] }[];
  };
  subjectGlobalRoles?: string[];
}
```

> **Reuses the Global-Role-Change pattern.** Like `PLATFORM_ADMIN_GLOBAL_ROLE_CHANGED`,
> the *server* resolves the platform-admin recipient set (via
> `NotificationRecipientsService`) and ships a `recipients: UserPayload[]` array
> in the payload; the notifications service does **not** resolve recipients. See
> [research.md §R8](./research.md) for the rationale — the notifications service
> has no authenticated GraphQL path to read admin emails, one recipient model is
> kept across all events, and no new auth/resolver infrastructure is needed.

### 2.4 `USER_EMAIL_CHANGE_SPACE_ADMIN_NOTIFICATION` → a space's admins & leads

A per-space fan-out so the administrators and leads of every space the subject
belongs to are aware of the change. The server publishes **one event per space**
the subject is a member of — regardless of the subject's own role in it; a
subject who belongs to no space produces none. Like event 2.3, recipients are
**resolved on the server** and embedded in the payload — here, each space's own
admins and leads, with the subject excluded.

```ts
interface UserEmailChangeSpaceAdminNotificationPayload extends NotificationEventPayloadSpace {
  // NotificationEventPayloadSpace supplies eventType, triggeredBy, platform,
  // recipients: UserPayload[] — that space's server-resolved admins/leads —
  // and space — the single space this event concerns.
  subjectProfileSummary: { id: string; displayName: string };
  oldEmail: string;              // full — admin/lead recipients are trusted
  newEmail: string;              // full
  initiatorProfileSummary?: { id: string; displayName: string };
  initiatorRole: 'self' | 'platform_admin';
  commitTimestampISO8601: string;
  triggerOutcome: 'COMMITTED' | 'DRIFT_DETECTED';
}
```

> **Reuses the space-event recipient model.** The payload extends
> `NotificationEventPayloadSpace`, so it flows through the notifications
> service's standard space-event pipeline. The server resolves each space's
> admins + leads (`SPACE_ADMIN ∪ SPACE_SUBSPACE_ADMIN ∪ SPACE_LEAD`) — note
> there is **no** `RECEIVE_NOTIFICATIONS_ADMIN` privilege filter, so a space
> lead who lacks that platform privilege is still notified; the per-user
> `space.admin.userEmailChanged` setting is the opt-out gate. The notifications
> service does **not** resolve recipients for this event — it reads
> `payload.recipients` like every other event.

---

## 3. Scope

### In scope
1. **`@alkemio/notifications-lib`** — four payload interface classes (§2), exported, version bumped.
2. **`alkemio-notifications` service** — for each event: an `@EventPattern` handler, a payload-builder case, an event→template-name mapping, and an email template.
3. A coordinated **dependency bump** of `@alkemio/notifications-lib` in this repo (and, eventually, in the server) and a **Docker image rebuild** of the service.

### Out of scope
- **Any server-side change** — the server already publishes all four events, and for the two admin fan-out events (2.3 global-admin, 2.4 per-space) it already embeds a server-resolved `recipients` array via `NotificationRecipientsService`. The notifications service consumes that list via its standard recipient pipeline; it adds no resolver capability of its own.
- Localisation — English only (parent FR-016a).
- In-app / push channels for the email-change events in the first cut — **email only** initially (extend later via the standard channel mechanism).
- Broadening event-2.3 recipients beyond global admins (see §5 — a future server-side policy change). Note: notifying the admins/leads of the subject's spaces is **not** such a broadening — it is event 2.4, a distinct event the server already publishes.

---

## 4. Functional requirements

### Library (`lib/src/dto/`)

- **FR-N1** Add four payload interfaces matching §2, alongside the existing
  `lib/src/dto/platform/` payloads (e.g. a new `email-change/` subfolder or
  flat files following the `notification.event.payload.*.ts` convention).
- **FR-N2** Export them from the package index. Bump the package version
  (additive — no breaking changes to existing payloads).

### Service — event handling (`service/src/app.controller.ts`)

- **FR-N3** Add four `@EventPattern` handlers, one per event value, each
  delegating to `notificationService.processNotificationEvent(payload, context)`
  — mirroring `sendPlatformGlobalRoleChangeNotification`.
- **FR-N4** The event-name constants must match the server's wire values
  exactly: `USER_EMAIL_CHANGE_SECURITY_SIGNAL`,
  `USER_EMAIL_CHANGE_NEW_ADDRESS_NOTIFICATION`,
  `USER_EMAIL_CHANGE_GLOBAL_ADMIN_NOTIFICATION`,
  `USER_EMAIL_CHANGE_SPACE_ADMIN_NOTIFICATION`.

### Service — payload builders & template mapping (`notification.service.ts`, `notification.email.payload.builder.service.ts`)

- **FR-N5** Add a `processNotificationEvent` switch case per event that calls a
  new `createEmailTemplatePayload…` builder.
- **FR-N6** Add the event→template-name mapping case per event (the second
  switch, ~line 468), e.g.:
  - `USER_EMAIL_CHANGE_SECURITY_SIGNAL` → `user.email.change.security.signal`
  - `USER_EMAIL_CHANGE_NEW_ADDRESS_NOTIFICATION` → `user.email.change.new.address`
  - `USER_EMAIL_CHANGE_GLOBAL_ADMIN_NOTIFICATION` → `platform.admin.user.email.change`
  - `USER_EMAIL_CHANGE_SPACE_ADMIN_NOTIFICATION` → `space.admin.user.email.change`

### Service — recipient resolution

- **FR-N7** **Security signal** — single recipient: `payload.recipientEmail`
  (the old address). The address may no longer correspond to an active identity;
  deliver to the raw address regardless. Respect the existing blacklist /
  unsubscribe checks.
- **FR-N8** **New-address notification** — single recipient:
  `payload.recipientEmail` (the new address).
- **FR-N9** **Global-admin notification** — recipients arrive **pre-resolved**
  in `payload.recipients`, exactly as for `PLATFORM_ADMIN_GLOBAL_ROLE_CHANGED`.
  The notifications service does NOT resolve recipients for this event — it
  reads `payload.recipients` and runs the standard blacklist filter +
  per-recipient send. The server resolves the set via
  `NotificationRecipientsService` (`GLOBAL_ADMIN` ∪ `GLOBAL_SUPPORT` ∪
  `GLOBAL_LICENSE_MANAGER`, filtered by the admin-notification setting,
  excluding the change's subject) — see research.md §R8. `subjectMemberships` /
  `subjectGlobalRoles`, if present, are optional context for the email body
  only, not recipient-resolution inputs.
- **FR-N13** **Space-admin notification** — recipients arrive **pre-resolved**
  in `payload.recipients` (that space's admins and leads, the change's subject
  excluded), exactly as for event 2.3. The notifications service does NOT
  resolve recipients — it reads `payload.recipients` and runs the standard
  blacklist filter + per-recipient send. The server publishes **one event per
  space** the subject is a member of, and resolves each
  space's recipient set itself (`SPACE_ADMIN` ∪ `SPACE_SUBSPACE_ADMIN` ∪
  `SPACE_LEAD`, no `RECEIVE_NOTIFICATIONS_ADMIN` filter, gated by the per-user
  `space.admin.userEmailChanged` setting) — see research.md §R8.

### Service — email templates (`service/src/email-templates/`)

- **FR-N10** **`user.email.change.security.signal`** — to the OLD address:
  - states the account's login email was changed;
  - shows `commitTimestampISO8601` (rendered human-readably);
  - shows the initiator context (`initiatorRole` — "a platform administrator" vs. "you");
  - shows the **masked** new address (`newEmailMasked`) — never the full address;
  - includes recovery instructions ("if this wasn't expected, contact support").
- **FR-N11** **`user.email.change.new.address`** — to the NEW address:
  - states this address is now the account's Alkemio login email;
  - shows the commit timestamp and initiator context;
  - shows the **full** new address (`newEmailFull`);
  - includes a login link (`loginUrl`);
  - includes a recovery / disclaimer line.
- **FR-N12** **`platform.admin.user.email.change`** — to platform admins:
  - subject + initiator display names;
  - full old and new emails;
  - commit timestamp;
  - renders differently for `triggerOutcome: COMMITTED` vs. `DRIFT_DETECTED`
    (the latter should read as an action item — "reconciliation required").
- **FR-N14** **`space.admin.user.email.change`** — to a space's admins / leads:
  - the space name / context (the event concerns exactly one space);
  - subject + initiator display names;
  - full old and new emails;
  - commit timestamp;
  - renders the `COMMITTED` vs. `DRIFT_DETECTED` variants like FR-N12.

---

## 5. Recipient model — current cut vs. future

| Event | Recipients (this PRD) | Future capability |
| --- | --- | --- |
| Security signal | Old address (payload) | — |
| New-address | New address (payload) | — |
| Global-admin | All platform global admins, server-resolved into `payload.recipients` | Broaden the server-side resolver (`NotificationRecipientsService`). A server-side policy change. |
| Space-admin | Each space's own admins + leads, server-resolved into `payload.recipients` — one event published per space the subject is a member of | Broaden the per-space recipient set, or add a sibling event for the leads of the subject's organisations. Server-side changes. |

---

## 6. Acceptance criteria

- [ ] The service no longer logs "unsupported event" for any of the four event patterns.
- [ ] After a successful `adminUserEmailChange`, MailSlurper shows **exactly one** message at the OLD address (security signal, masked new email) and **exactly one** at the NEW address (acknowledgement, full new email + login link).
- [ ] After a `DRIFT_DETECTED` outcome, the global-admin and space-admin notifications render the reconciliation-required variant.
- [ ] The global-admin notification reaches all platform global admins.
- [ ] When the subject is a member of one or more spaces, each such space's admins/leads receive the space-admin notification — **one message per space**. A subject who belongs to no space produces no space-admin emails.
- [ ] Rejected / rolled-back / other failure outcomes produce **no** email-change emails (the server does not publish these events for those outcomes — verify no spurious delivery).
- [ ] `@alkemio/notifications-lib` is version-bumped with the four exported payload types; the service builds against it; the Docker image is rebuilt.
- [ ] Existing notifications are unaffected (regression check on at least the Global-Role-Change flow).

---

## 7. Validation

Against a local stack with server spec 097 running:

1. Register a throwaway user; note its Alkemio user id. To exercise event 2.4, also make the subject a member of at least one space (any role).
2. As a platform admin, run `adminUserEmailChange` for that user.
3. Confirm in the service log that all four events are **handled** (no "unsupported event" warnings).
4. Open MailSlurper (`http://localhost:4436`) and confirm the old-address and new-address messages, with the masking / full-address rules from FR-N10–N11.
5. Confirm the global-admin message reached a platform admin other than the initiator.
6. Confirm the space-admin message reached the admins / leads of the space the subject joined in step 1 — one message per space the subject belongs to. A subject in no space produces no space-admin message.

This is the end-to-end check that server spec 097's
`quickstart.md` Scenarios 1 (steps 1.3 / 1.3a / 1.3b) currently cannot complete
because this component is unimplemented.

---

## 8. Notes & references

- Server-side event definitions: `src/common/enums/notification.event.ts` and the payload typings in `src/domain/community/user-email-change/dto/notification.payloads.ts` (server repo) — the source of truth for the wire shapes in §2.
- Rationale for server-side recipient resolution (reusing the Global-Role-Change pattern): [research.md §R8](./research.md).
- The server treats publishing as its complete responsibility (FR-016d for the global-admin event, FR-016e for the per-space event) and audits a `*_notification_failed` outcome only when the **publish** fails — per-recipient delivery is wholly owned by this component.
- Token-leakage guard: none of these payloads carry a token; this feature issues none.
