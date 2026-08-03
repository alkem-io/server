# Contract: session-id resolution

**Module**: `src/core/auth/oidc/session-id.resolver.ts`
**Consumers**: `src/core/auth/oidc/strategies/cookie-session.strategy.ts`,
`src/core/auth/oidc/forward-auth.resolver.service.ts`
**Satisfies**: FR-001 – FR-005

An **internal** contract. It answers one question — *may this request read the
session store, and with what key?* — for every component that reads a session by
cookie. It exists because the answer is currently given correctly in one place
(`forward-auth.resolver.service.ts`) and incorrectly in the place that matters most
(the strategy, on the path every request takes). See research R8.

## Surface

```ts
/**
 * The sid the session store may be read with, or null when the request has not
 * earned a store read.
 */
export function resolveCookieSessionId(
  req: {
    sessionID?: unknown;
    cookies?: Record<string, unknown>;
    headers?: { cookie?: string };
  },
  cookieName: string
): string | null;
```

`null` is not an error. It means "this request is anonymous as far as the session
layer is concerned" and the caller must resolve it as such, without touching the
store.

## Decision table

Let `raw = req.cookies?.[cookieName]` (falling back to the `Cookie` header — see
G4), and `sid = req.sessionID`.

| # | `raw` | `sid` | Returns | Store read? |
|---|---|---|---|---|
| 1 | absent / empty / non-string | any | `null` | **no** |
| 2 | present | absent / empty / non-string | `null` | **no** |
| 3 | present | present, `raw === 's:' + sid + '.' + <rest>` | `sid` | **yes** |
| 4 | present | present, prefix does not match | `null` | **no** |

Row 4 covers a cookie whose signature failed verification (`express-session`
discarded it and generated a fresh sid), a cookie for a different session, a
legacy unsigned cookie, and a tampered one. Row 2 covers a WebSocket upgrade whose
middleware replay has not run.

## Guarantees

### G1 — No store read without a presented cookie

Rows 1 and 2 return `null`, so a request that sent no session cookie issues zero
session-store commands. This is the whole of FR-001, and the reason a Redis outage
stops being a total outage: anonymous traffic no longer depends on Redis at all.

### G2 — The returned sid is never derived from client-supplied bytes

The function only ever returns `req.sessionID`, which `express-session` produced by
**unsigning** the cookie with the server's secret. `raw` is used solely as a
*predicate*: does this cookie account for this sid?

*Why this is not pedantry*: the discarded alternative — parsing the sid out of
`s:<sid>.<sig>` — reads identically and is a session-forgery vector, because it
skips signature verification entirely. A caller could present
`s:<victim-sid>.<garbage>` and have the victim's key read. The strategy's current
fallback (`cookie-session.strategy.ts:84`) is that shape already, defanged only by
the accident that the `s:` prefix stops it matching a Redis key — while its own
comment two lines above explains why the value is unusable. FR-004 forbids the
shape, and this function is where the prohibition is enforced. Research R7.

### G3 — The prefix check needs no secret and no new dependency

`express-session` writes the cookie as `'s:' + signature.sign(sid, secret)`
(`express-session/index.js:671`) and `cookie-signature`'s `sign` returns
`val + '.' + hmac`. So `raw.startsWith('s:' + sid + '.')` is exactly "the middleware
derived `sid` from this cookie", computed without the signing key.
`cookie-signature` is not a direct dependency of this repository and is not added.

The trailing `'.'` in the prefix is load-bearing: without it, a sid that is a
prefix of another sid would match.

### G4 — Cookie presence is read from the parsed cookies, with the raw header as
a fallback

`req.cookies` is populated by `cookie-parser`, which `main.server.ts` registers
before the session middleware and replays onto WebSocket upgrades. If it is absent
— a harness, a route mounted before the parser, a future reordering — the function
falls back to parsing `req.headers.cookie`, which is what `express-session` itself
treats as authoritative (`getcookie`, `index.js:544-568`).

*Why the fallback exists*: without it, removing or reordering `cookie-parser` would
silently make **every** request anonymous rather than failing loudly. A resilience
fix that introduces a silent total-auth-outage mode would be a poor trade.

### G5 — Pure

No I/O, no logging, no exceptions, no dependency on Nest. A plain function over a
request-shaped object, so it is testable without a container and reusable from
both a passport strategy and a REST resolver service. Constitution §2 (`src/library`
purity is preferred, but this needs the OIDC cookie semantics that live here, so it
sits in the OIDC directory as a side-effect-free module).

## Non-guarantees

- **Does not validate the session.** Whether the sid names a live, tombstoned,
  revoked or expired session is entirely the caller's business and is unchanged by
  this feature.
- **Does not verify the signature itself.** It verifies that *the middleware*
  verified it, which is strictly stronger than re-implementing the check and cannot
  drift from `express-session`'s own opinion.
- **Does not cover session establishment.** `/api/auth/oidc/{callback,refresh,logout}`
  read `req.sessionID` directly and legitimately; they are creating or tearing down
  a session rather than authenticating with one. Not consumers of this function.

## Test obligations

Each must fail against `develop` @ `caa1a0d33` where it targets D1 (FR-031).

| ID | Input | Expected | Guarantee |
|---|---|---|---|
| S1 | no cookies at all, `sessionID` present | `null` | G1 / FR-001 |
| S2 | `cookies: {}`, `sessionID` present | `null` | G1 / FR-001 |
| S3 | cookie `s:<sid>.<sig>`, `sessionID === sid` | `sid` | decision row 3 |
| S4 | cookie `s:<other>.<sig>`, `sessionID === sid` | `null` | G2 / FR-005 |
| S5 | cookie present, `sessionID` undefined | `null` | decision row 2 |
| S6 | cookie without the `s:` prefix | `null` | G2 |
| S7 | cookie `s:<sid>` with no `.` separator | `null` | G3 (trailing dot) |
| S8 | `sessionID` is a strict prefix of the cookie's sid | `null` | G3 (trailing dot) |
| S9 | `req.cookies` absent, `headers.cookie` carries the signed cookie | `sid` | G4 |
| S10 | strategy-level: cookie-less request performs **zero** calls on the session-store mock | G1 / **FR-028** |
