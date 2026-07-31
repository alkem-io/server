# Contract — `me` graceful degradation

**Feature**: `specs/107-oidc-session-revocation` (User Story 2 / WS3)
**Surface**: `MeQueryResults` and `MeConversationsResult`

**The GraphQL schema does not change.** No field is added, removed, renamed or
re-typed; no nullability changes. Only the *failure behaviour* changes, from
raising an error to returning the empty value the existing type already permits.
`pnpm schema:diff` must report **0 breaking changes** — an exit gate, not an
assumption.

---

## Trigger condition

`actorContext.actorID === ''`.

Note this is **not** exclusive to orphaned sessions.
`ActorContextService.createAnonymous()` sets `actorID = ''`
(`actor.context.service.ts:35`), so every one of these fields errors for **any
anonymous visitor today**. The degradation therefore fixes a live defect wider
than the orphan case: `me { notificationsUnreadCount }` from a logged-out browser
is currently an error response.

---

## The seven guards

The design input names five. Two more were found on re-verification (research
R9), and omitting either would ship a fix that does not actually work.

| # | Field | Anchor | Today | Becomes |
|---|---|---|---|---|
| 1 | `notifications` | `me.resolver.fields.ts:37` | `ForbiddenException` | empty page (below) |
| 2 | `notificationsUnreadCount` | `me.resolver.fields.ts:59` | `ValidationException` | `0` |
| 3 | `communityInvitationsCount` | `me.resolver.fields.ts:108` | `ValidationException` | `0` |
| 4 | `communityInvitations` | `me.resolver.fields.ts:133` | `ValidationException` | `[]` |
| 5 | `communityApplications` | `me.resolver.fields.ts:159` | `ValidationException` | `[]` |
| 6 | `conversations` (container) | `me.resolver.fields.ts:221` | `ValidationException` | `{}` |
| 7 | `conversations` (list) | `me.conversations.resolver.fields.ts:23` | `ValidationException` | `[]` |

**Guard 1** throws a different exception type, which is presumably why an
exception-type-based sweep missed it — and it is the paginated non-nullable field,
so it is the one whose empty value actually needed specifying.

**Guard 7 is the one that matters most.** Guard 6 only builds the empty
container; the real thrower is in the second file. Relaxing 6 alone leaves
`me { conversations { conversations } }` erroring exactly as before — a cosmetic
fix that passes a shallow test and fails the actual client query
(`UserPendingMemberships` selects into it). Both must change.

**Not in scope**: `user` (`me.resolver.fields.ts:87`) already returns `null`
correctly, and `id` (`:75`) is deliberately untouched — see below.

---

## Empty page shape (guard 1, FR-029a)

```ts
{
  total: 0,
  items: [],
  pageInfo: { hasNextPage: false, hasPreviousPage: false },
}
```

`startCursor` and `endCursor` are optional on `IRelayStylePageInfo` and nullable
in the SDL (`relay.style.paginated.type.ts:31-35`), so omitting them is valid and
matches what the pagination helper produces for an empty result set. A degraded
response is therefore byte-identical to a legitimately empty one, and needs no
client change to consume.

---

## `me.id` is deliberately unchanged

It renders as the literal `"me-"` when there is no actor
(`` `me-${actorContext.actorID}` ``, `:75`). Resolved in clarification pass 1:
leave it. It already renders that way for **every** anonymous visitor, so it is
neither new nor orphan-specific; changing it is an Apollo cache-key change with
no security benefit and a real risk of colliding cached anonymous and
formerly-authenticated states. Recorded here so a reviewer does not re-open it.

---

## Logging (FR-030)

Every degraded field emits exactly one **warn**-level line before returning:

```
Degrading me.<field> to its empty value: request has no resolved actor
```

with the field name and `LogContext` in structured context. Two reasons this is
mandatory rather than optional:

1. Constitution principle 5 forbids silent failure paths.
2. Without it, the degradation would *hide* a genuine authorization regression
   behind a plausible-looking empty response. The log line is what keeps the
   condition visible.

Exception-message immutability does not apply (no exception is raised), but the
message stays static with variables in structured context, matching the same
principle.

---

## Behaviour for authenticated callers

**Unchanged in every respect.** Each guard is a pre-existing early-return branch;
only its body changes. A spec asserts the happy path still delegates to the same
service method with the same arguments for all seven.

---

## Acceptance

```graphql
query { me { id
             notificationsUnreadCount
             communityInvitationsCount
             communityInvitations(states: []) { id }
             communityApplications(states: []) { id }
             notifications { total inAppNotifications { id } pageInfo { hasNextPage } }
             conversations { conversations { id } } } }
```

Issued with a request carrying no resolved actor:

- `errors` is **absent** (SC-008),
- `me.id === "me-"`,
- every count is `0`, every list is `[]`, `notifications.total` is `0`,
- seven warn lines were emitted.
