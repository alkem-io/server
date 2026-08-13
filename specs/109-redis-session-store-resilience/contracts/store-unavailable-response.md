# Contract: the store-unavailable response

**Module**: `src/core/auth/oidc/strategies/cookie-session.exception-filter.ts`
(the shared wire-shape helper and the REST filter) +
`src/common/exceptions/session-store-unavailable.exception.ts` (the GraphQL arm)
**Consumers**: the express session-middleware error handler (`main.server.ts`), the
Nest REST filter, and `AuthInterceptor` (GraphQL)
**Satisfies**: FR-016 – FR-022, and preserves `107-oidc-session-revocation` FR-022b

An **internal** contract over an **externally visible** wire shape. Three different
layers can be the one that discovers the session store is unreachable; a client
must not be able to tell which. This document is what stops them drifting (FR-021).

## The three paths

| # | Layer | Reached when | Transport |
|---|---|---|---|
| P1 | express session-middleware error handler | total outage, request carries a cookie — `express-session` reads the store *before* Nest exists and calls `next(err)` | any |
| P2 | `CookieSessionStoreUnavailableFilter` | the strategy's store read fails on a REST route | REST |
| P3 | `AuthInterceptor` GraphQL arm | the strategy's store read fails on a GraphQL route | GraphQL |

P1 is new to production. It exists because on `develop` this path produces an
unhandled middleware error — an HTML **500** — since `main.server.ts` registers no
error handler after the session middleware (research R6, spec Clarification Q1).
The middleware that serves it is the one already shipped for exactly this purpose
(`cookieSessionStoreUnavailableMiddleware`), whose comment says it is for "the raw
express path"; until now it had only a test caller.

P2 is unchanged from `107-oidc-session-revocation` except for the cookie attributes
(G3).

P3 is new. It is why adding `SessionStoreUnavailableError` to the interceptor's
allow-list is necessary but not sufficient: the filter that would then catch the
error reads `host.switchToHttp()`, which on a GraphQL request returns the GraphQL
root and args rather than a request and response (research R9).

## Shared wire shape

```ts
export interface SessionCookieAttributes {
  name: string;
  secure: boolean;
  domain?: string;
  maxAge: number;      // milliseconds
  sameSite: 'lax';
  path: '/';
  httpOnly: true;
}

/** The single definition of what a store-unavailable response looks like. */
export function applyStoreUnavailableResponse(
  req: Request,
  res: Response | undefined,
  cookie: SessionCookieAttributes
): void;
```

All three paths call this. It sets, in order:

1. the `Retry-After` header;
2. the re-asserted session cookie, if one was presented;

and deliberately does **not** set the status or write a body — those differ by
transport (G4) and belong to the caller.

| Element | Value | Requirement |
|---|---|---|
| HTTP status | **503** | FR-017, FR-019 |
| `Retry-After` | **`5`** | FR-017, FR-019 — the value `107-oidc-session-revocation` FR-022b fixed |
| Session cookie | re-asserted with the **full** attribute set | FR-020, G3 |
| Cookie clearing | **never** — no `max-age=0`, no expiry in the past | FR-020 |
| Redirect | never | inherited from FR-022b |

### G1 — Never 401

`SessionStoreUnavailableError` must not be converted into `AuthenticationException`
anywhere on the path. The conversion currently happens in the passport callback
(`auth.interceptor.ts:344-350`), whose allow-list preserves only
`BearerValidationError` and `CookieSessionInvalidError`. Adding
`SessionStoreUnavailableError` there is the minimum, and by itself only relocates
the problem to P3.

*Why it matters beyond tidiness*: a single-page application reads 401 as "your
session is gone, sign in again" and 503 + `Retry-After` as "come back in five
seconds". As shipped, any Redis blip is liable to present to users as a forced
logout or a redirect loop. FR-016, FR-018.

### G2 — The cookie survives the outage unchanged

The value written is the **raw signed cookie exactly as presented**
(`req.cookies[name]`), so no re-signing occurs and the signing secret is not needed
at the response site. If no cookie was presented, none is set.

### G3 — Re-assertion uses the full configured attribute set

`httpOnly`, `sameSite`, `path`, **`secure`**, **`domain`** and **`maxAge`** — the
same attributes `main.server.ts` issues the cookie with.

*Why this is a change and not a restatement*: the shipped `send503` sets only
`httpOnly`, `sameSite` and `path`. In a production deployment (`secure: true`,
`domain` configured) that response tells the browser to replace a Secure,
domain-scoped, 14-day cookie with a non-Secure, host-only, browser-session one.
Dropping `secure` is a security downgrade triggered by a Redis blip; dropping
`domain` shadows the real cookie so it stops being sent; dropping `maxAge`
silently shortens every affected user's session. Each inverts the purpose of
re-asserting at all. Research R11.

### G4 — Status, header and cookie are shared; the body is not

| Path | Body |
|---|---|
| P1 | `{ "error": "session_store_unavailable" }` — unchanged from the shipped middleware |
| P2 | `{ "error": "session_store_unavailable" }` — unchanged from the shipped filter |
| P3 | the GraphQL error envelope: `extensions.code = "SESSION_STORE_UNAVAILABLE"`, `extensions.numericCode = 14119`, `extensions.http.status = 503` |

Requiring byte-identical bodies would mean either emitting a GraphQL envelope from
a middleware that runs before GraphQL exists, or stripping the envelope from
responses where clients rely on it. FR-021 governs what a client acts on — status,
retry hint, cookie — and those are identical. Spec Clarification Q16.

### G5 — The GraphQL status is a wire-level status, not just an envelope field

`SessionStoreUnavailableException extends BaseException` sets
`extensions.http.status = 503`, which Apollo Server 4 reads to override the HTTP
status. Without it Apollo emits HTTP 200 with an error envelope — the same trap
`AuthenticationException` documents in its own constructor ("Stage-1 exit log
finding G"). SC-003 asserts the wire status, so this is load-bearing.

`Retry-After` is set on the express response directly, via the same
`getResponse(context, isGraphql, req)` helper the interceptor already uses for
cookie clearing — necessary because this application's Apollo context factory
returns `{ req }` and never `res` (`auth.interceptor.ts:34-47`).

### G6 — The auth entry points are not made worse

`/api/auth/oidc/{login,callback,logout}` are already special-cased for a *rejected*
session (`isAuthEntryPoint`, `auth.interceptor.ts:79-90`). They are **not**
special-cased for an unreachable store, and must not be: `/callback` and `/logout`
genuinely need the store, and letting `/login` through during an outage would only
produce a sign-in that cannot complete. 503 + `Retry-After` is the honest answer for
all three. FR-022 asks that they be no worse than today, and today they hang and
then 401 — or, on the cookie-bearing path, 500.

### G7 — One definition, three callers, one test

The helper is exported and unit-tested once; each path's test asserts that it
*delegates* rather than re-asserting the whole shape. That is what makes FR-021
checkable instead of aspirational.

## Non-guarantees

- **Not a retry mechanism.** The server does not retry the store read on the
  client's behalf. `Retry-After: 5` asks the client to.
- **Does not distinguish "Redis is down" from "Redis is slow".** Both are
  store-unreachable from the request's point of view, and the distinction is not
  actionable by a client.
- **Does not change what happens to a session that *is* readable.** Tombstones,
  subject revocation and the absolute-TTL ceiling still produce 401 with cookie
  clearance, exactly as `107-oidc-session-revocation` specifies. "Session ended"
  clears; "store briefly unreachable" re-asserts. Keeping that line intact is the
  point.

## Test obligations

Each must fail against `develop` @ `caa1a0d33` where marked (FR-031).

| ID | Assertion | Requirement | Fails on develop |
|---|---|---|---|
| U1 | The passport callback rejects with `SessionStoreUnavailableError` itself, not `AuthenticationException` | FR-016 | **yes** |
| U2 | On a GraphQL context, the interceptor throws an exception carrying `extensions.http.status === 503` and `numericCode 14119` — not 401/11101 | FR-017, FR-018, **FR-030** | **yes** |
| U3 | On a GraphQL context, `Retry-After: 5` is set on the response | FR-017 | **yes** |
| U4 | The presented cookie is re-asserted, not cleared, with `secure`, `domain` and `maxAge` present | FR-020, G3 | **yes** |
| U5 | On a REST context, the shipped 503 filter behaviour is unchanged | FR-019 | no (guard) |
| U6 | `CookieSessionInvalidError` still yields 401 **with** cookie clearance | FR-006 regression guard | no (guard) |
| U7 | The express error middleware answers 503 for a typed store failure and calls `next(err)` for anything else | FR-016a | **yes** |
| U8 | All three paths produce the same status, `Retry-After` and cookie treatment | FR-021 | **yes** |
| U9 | `/api/auth/oidc/{login,callback,logout}` are **not** special-cased for an unreachable store: each answers 503 + `Retry-After`, rather than the entry-point passthrough they receive for a *rejected* session | FR-022, G6 | **yes** |

U9 exists because G6 was otherwise the only guarantee in this contract with no
assertion behind it. `isAuthEntryPoint` already exempts these routes from one
condition, and extending that exemption to this one is an easy reflex for a future
reader; the test is what stops it. It equally catches the opposite mistake —
letting `/login` through during an outage, which only produces a sign-in that
cannot complete.
