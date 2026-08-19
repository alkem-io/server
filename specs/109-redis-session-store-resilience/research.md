# Research: Redis session-store resilience (feature 109 / server#6332)

**Phase**: 0 · **Date**: 2026-08-03 · **Spec**: [spec.md](./spec.md)

Every claim below is verified against the code and the pinned dependency
versions actually installed in this worktree (`ioredis@5.10.1`,
`express-session@1.19.x`, `connect-redis@7.1.x`), with file and line references.
Nothing here is recalled from documentation.

---

## R1 — Where the ~42 seconds actually comes from

**Claim under test**: the issue attributes the ~42 s to "several session
operations per request, in series", each burning ~10.5 s.

**Finding**: the arithmetic is right about the mechanism and wrong about the
multiplier. It is **one** command waiting for a queue flush, not four commands
each waiting for their own.

`ioredis` defaults (`node_modules/ioredis/built/redis/RedisOptions.js:4-58`):

| Option | Default | Consequence |
|---|---|---|
| `enableOfflineQueue` | `true` | a command issued while disconnected is **queued**, not rejected |
| `maxRetriesPerRequest` | `20` | the queue is flushed with an error only every 21st reconnect attempt |
| `retryStrategy` | `times => Math.min(times * 50, 2000)` | backoff ramps 50 ms → 2000 ms, saturating at attempt 40 |
| `connectTimeout` | `10000` | 10 s per connection attempt |
| `commandTimeout` | *(unset)* | **no** ceiling on an individual command |
| `lazyConnect` | `false` | connects eagerly at construction |

The flush condition is `retryAttempts % (maxRetriesPerRequest + 1) === 0`
(`built/redis/event_handler.js:198-210`), and `retryAttempts` is a **client-level**
counter that keeps climbing for the whole outage — it is reset only by `ready`
(`built/redis/event_handler.js:228-230`). So a queued command does not wait for
"its own" 20 retries; it waits until the next multiple of 21 reconnect attempts.

That predicts the measured numbers exactly:

- Early in the outage the backoff is still ramping, so a flush window is short
  and irregular — matching the observed **2.29 s** and **32.55 s**.
- Once `times ≥ 40` the backoff is pinned at 2000 ms, so a full window is
  `21 × 2000 ms = 42 000 ms` — matching the observed **42.04 s** to within 40 ms.

**Why this matters for the design**: the ceiling is not "10.5 s per command", it
is "up to 42 s per command, unbounded above by anything the request controls".
Reducing `maxRetriesPerRequest` alone would shrink the window but keep the shape;
`enableOfflineQueue: false` removes it entirely, because the command is rejected
at issue time rather than queued (`built/Redis.js:363-366`):

```js
if (!writable) {
  if (!this.options.enableOfflineQueue) {
    command.reject(new Error("Stream isn't writeable and enableOfflineQueue options is false"));
    return command.promise;
  }
```

That is a **synchronous rejection — 0 ms** — for the entire duration of an outage.

---

## R2 — `enableOfflineQueue: false` and `lazyConnect` are mutually hostile

`sendCommand` starts a lazy connection but does **not** wait for it
(`built/Redis.js:328-330`):

```js
if (this.status === "wait") {
  this.connect().catch(noop);
}
```

Execution then falls through to the writability check above. With
`enableOfflineQueue: false`, the very first command on a lazily-connected client
is therefore **always rejected**, even against a perfectly healthy Redis — the
socket cannot possibly be writable in the same tick.

**Consequence for this feature**: the health probe (`health.module.ts:37`) already
combines both options, so its first `PING` after boot always reports unhealthy and
self-corrects on the next one. That is tolerable for a probe. It would **not** be
tolerable for the request path: the first authenticated request after every deploy
would 503.

**Decision**: request-path clients connect eagerly (`lazyConnect` left at its
`false` default); only the probe opts into lazy connection. This is why FR-014
exists, and why the factory takes an explicit option rather than one profile for
everyone. It is also the reason the factory cannot simply "apply the health
probe's four options everywhere", which is the obvious-looking fix and is wrong.

---

## R3 — `commandTimeout` is the only defence against a *responsive-then-silent* store

`connectTimeout`, `maxRetriesPerRequest` and `enableOfflineQueue` all key off
connection state. A store that completes the TCP handshake and then stops
answering leaves the client in `ready`, so commands are written to the socket and
simply never settle. `commandTimeout` is applied per command in `sendCommand`,
**before** the writability branch (`built/Redis.js:341-343`):

```js
if (typeof this.options.commandTimeout === "number") {
  command.setTimeout(this.options.commandTimeout);
}
```

so it bounds queued and in-flight commands alike. It is unset by default. Without
it, fail-fast would cover `docker stop redis` and not cover a hung Redis, an
overloaded one, or a network black hole — the failure modes that actually produce
long-tail latency in production.

**Decision**: `commandTimeout: 500`. Value justified in R5.

---

## R4 — The session clients have no `error` listener, and `ioredis` hides that from you

`ioredis` never emits `error` through the raw `EventEmitter` path; it routes
through `silentEmit` (`built/Redis.js:509-534`):

```js
if (this.listeners(eventName).length > 0) {
  return this.emit.apply(this, arguments);
}
if (error && error instanceof Error) {
  console.error("[ioredis] Unhandled error event:", error.stack);
}
```

Two findings follow.

1. **This is why #6332 is not #6330.** The cache's `redis@3.1.2` emits `error`
   through a plain `EventEmitter`, so an unobserved emit is an uncaught exception
   and the process dies — that was #6330. `ioredis` swallows it into a console
   write instead, which is why a Redis outage today produces a hang rather than a
   crash. The two libraries fail in opposite directions from the same omission.
2. **It is a live violation of the repository's own rules.** `console.error` is a
   `noConsole` error under Biome for first-party code, and the constitution (§5)
   forbids silent failure paths. Every session-client failure currently bypasses
   Winston entirely, so none of it is structured, correlated or shipped.

**Decision**: the factory attaches an `error` listener unconditionally, before it
returns the client — the same load-bearing guarantee as the cache factory's G2.
Attaching it satisfies FR-027 and, as a side effect, removes the console writes.

---

## R5 — Budget arithmetic: why 500 ms and not 1000 ms

A single cookie-bearing request can issue **two sequential store reads through two
different clients**:

1. `express-session` → `connect-redis` → the `main.server.ts` client
   (`node_modules/express-session/index.js:500`);
2. `CookieSessionStrategy` → `SESSION_STORE_HANDLE` → the `OIDC_REDIS_CLIENT`
   (`cookie-session.strategy.ts:89`), followed on the authenticated path by the
   subject-revocation-marker read (`:133`).

SC-002 budgets **1 s for the whole request**. Two 1000 ms ceilings would consume
the entire budget on the failure path alone, leaving nothing for the rest of the
request and putting SC-002 exactly on the boundary. Two 500 ms ceilings leave
500 ms of headroom.

In the total-outage case the true cost is 0 ms per command (R1), so this ceiling
only binds in the hung-store case — where it is the difference between a bounded
degradation and a return of the original defect in a subtler form.

`connectTimeout: 500` and `maxRetriesPerRequest: 1` are adopted verbatim from
`health.module.ts:37-43`, which already carries the reasoning in a comment. Reusing
the repository's own numbers is deliberate: an incident postmortem should not have
to reconcile two different opinions about how long Redis is allowed to take.

---

## R6 — `express-session` reads the store *before* any authentication code runs

`req.sessionID` is assigned from the cookie, and is `undefined` when there is no
valid cookie (`express-session/index.js:228`):

```js
var cookieId = req.sessionID = getcookie(req, name, secrets);
```

`getcookie` (`:544-590`) requires the `s:` prefix and a verifying signature;
`unsigncookie` returning `false` yields `undefined`. Then (`:497-505`):

```js
if (!req.sessionID) {           // no valid cookie
  generate();                   // → req.sessionID = generateId(req)
  next();
  return;
}
store.get(req.sessionID, function (err, sess) {
  if (err && err.code !== 'ENOENT') { next(err); return }
```

Three consequences, all load-bearing:

1. **The middleware itself never reads the store for a cookie-less request.** The
   ~42 s observed on a cookie-less query is therefore entirely the *strategy's*
   doing, exactly as the issue says.
2. **`req.sessionID` after the middleware is ambiguous by construction** — it is
   either the unsigned cookie sid or a freshly generated one, produced by the
   *same* generator (`generateSessionId` → `uid(24)`, `:533`). Nothing about its
   shape distinguishes them. This is D1's root cause: the strategy cannot tell,
   and neither can any check that looks only at `req.sessionID`.
3. **A store failure on a cookie-bearing request becomes `next(err)`** — a raw
   `ioredis` error escaping the session middleware. `connect-redis@7` passes the
   client rejection straight to the callback
   (`node_modules/connect-redis/dist/cjs/index.js` `get`: `catch (err) { return cb(err) }`).
   `main.server.ts` registers **no** error-handling middleware after
   `app.use(sessionMiddleware)` (`:130-133`), so this reaches Express's default
   handler as an HTML **500**.

Finding 3 is new: the cookie-bearing outage path on `develop` returns 500, not the
401 the issue measured on the cookie-less path. Recorded as spec Clarification Q1
and requirement **FR-016a**.

---

## R7 — How to tell a cookie-borne sid from a generated one, without trusting the client

The cookie's wire value is `s:<sid>.<signature>` — `express-session` writes it as
`'s:' + signature.sign(val, secret)` (`:671`), and `cookie-signature`'s `sign`
returns `val + '.' + hmac`. So for an **accepted** cookie:

```text
req.cookies[name] === 's:' + req.sessionID + '.' + <hmac>
```

Therefore `raw.startsWith('s:' + req.sessionID + '.')` proves the middleware
accepted *this* cookie and derived *this* sid from it — without the secret, without
importing `cookie-signature` (which is not a direct dependency of this repo), and
without ever deriving a lookup key from client bytes.

**The rejected alternative matters.** Parsing the sid out of the raw cookie —
stripping `s:` and the signature — looks equivalent and is a **session-forgery
vector**: a caller could present `s:<victim-sid>.<garbage>` and have the victim's
key looked up, with the signature never checked. The strategy's existing fallback
(`cookie-session.strategy.ts:84`) is a defanged version of exactly this shape: it
uses the raw signed value as a lookup key, which happens to be harmless only
because the `s:` prefix makes it never match a Redis key. Its own comment two lines
above says so. It is removed (FR-004, Clarification Q7) because the shape is wrong,
not because this instance is exploitable.

---

## R8 — The guard already exists in this repository, in a third place

`forward-auth.resolver.service.ts:62-71`:

```ts
// Only honour it when the request actually carried the session cookie —
// express-session auto-generates a sid for every request, so without this
// guard the endpoint would attempt a BFF Redis lookup for unauthenticated
// traffic.
const sid = req.cookies?.[this.sessionCookieName]
  ? typeof req.sessionID === 'string' && req.sessionID.length > 0
    ? req.sessionID
    : undefined
  : undefined;
```

The forward-auth resolver understands D1 completely and defends against it. The
strategy — sitting on the path every request takes — does not.

This is the same shape as D2: the health probe knows how to build a fail-fast
client and the two clients that matter do not. **Three** correct implementations
exist in this codebase and none of them is reachable from the site that needed it.

**Decision**: extract the check into one shared helper and call it from **both**
sites. The forward-auth version is the better starting point but is not quite
sufficient — it does not verify that `req.sessionID` was derived from the presented
cookie (R7), so a request with a tampered cookie still reaches the store. The
shared helper adds that, and both call sites get it.

---

## R9 — Reachability of the exception filter on the GraphQL path

`CookieSessionStoreUnavailableFilter` is `@Catch(SessionStoreUnavailableError)`
and calls `host.switchToHttp()` (`cookie-session.exception-filter.ts:47-55`). On a
GraphQL request the `ArgumentsHost` arguments are `[root, args, context, info]`,
so `switchToHttp().getRequest()` returns the GraphQL **root** and `getResponse()`
returns the GraphQL **args** object. Calling `res.setHeader` on that throws.

So adding `SessionStoreUnavailableError` to the interceptor's allow-list is
**necessary but not sufficient**: the error would then propagate, and the filter
that catches it would fail on the GraphQL transport. Two options:

- **(a)** Teach the filter to branch on `host.getType()` and reach the response via
  the GraphQL context.
- **(b)** Handle the transport branch in the interceptor, which *already* solves
  the "Apollo context carries no `res`" problem for the 401 path via its
  `getResponse(context, isGraphql, req)` helper (`auth.interceptor.ts:48-66`, with
  a comment explaining that `gqlContext.res` is always `undefined` in this app
  because `app.module.ts`'s context factory returns `{ req }` only).

**Decision: (b)**, with the wire shape delegated to a shared helper so the filter
and the interceptor cannot drift (FR-021). Reasons: the interceptor is the only
component that already knows how to reach the response on both transports and
already branches on `isGraphql` for precisely this purpose; a GraphQL error needs a
`GraphQLError` subclass to carry `extensions.http.status`, which is exception
construction, not filter work; and global-filter ordering across modules
(`UnhandledExceptionFilter` is registered first in `app.module.ts` with a comment
asserting that position) is a fragile thing to make correctness depend on. Option
(a) is left available and the filter keeps serving the REST path unchanged, so
`107-oidc-session-revocation`'s shipped and tested REST behaviour is not disturbed.

---

## R10 — The GraphQL 503 needs a status code, and 11xxx is the wrong band

`AuthenticationException` sets `extensions.http.status = 401`
(`authentication.exception.ts:17-19`) — that mechanism is Apollo Server 4's
documented override and is what makes the current 401 a wire-level 401 rather than
a 200 with an error envelope. The same mechanism produces the 503.

The numeric code is derived from `ErrorCategory * 1000 + specificCode`
(`error.status.metadata.ts:19-22`). `AUTHORIZATION` is band 11 — the band whose
`11101` the issue quotes as the wrong answer. `SYSTEM` is band 14 and means
infrastructure failure, which is what this is. Within band 14, codes 101–118 and
120 are taken; **119 is free** (verified by inspection of
`error.status.metadata.ts:330-435`).

**Decision**: `AlkemioErrorStatus.SESSION_STORE_UNAVAILABLE` → `SYSTEM`/119 →
numeric **14119**, message key `userMessages.system.sessionStoreUnavailable`,
following the shape of the neighbouring `STORAGE_SERVICE_UNAVAILABLE` (SYSTEM/120).
`AlkemioErrorStatus` is not registered as a GraphQL enum and does not appear in
`schema.graphql`, so this is not a schema-contract event and needs no baseline
regeneration.

---

## R11 — Cookie re-assertion is currently partial, and partial is worse than none

`send503` (`cookie-session.exception-filter.ts:22-32`) re-asserts with
`{ httpOnly, sameSite: 'lax', path: '/' }` only. The session cookie is issued by
`main.server.ts:117-127` with `secure: oidcConfig.cookie.secure`,
`domain: oidcConfig.cookie.domain`, and `maxAge: idleTtlS * 1000`.

Consequences in a production deployment (`secure: true`, `domain` set):

- **`secure` dropped**: the browser is told to replace a Secure cookie with a
  non-Secure one of the same name. Depending on the browser this either fails or
  downgrades the cookie — a security regression triggered by a Redis blip.
- **`domain` dropped**: writes a host-only cookie that shadows the domain-scoped
  one, so the real session cookie stops being sent.
- **`maxAge` dropped**: converts a 14-day persistent cookie into a browser-session
  cookie, silently shortening every affected user's session.

All three invert FR-020's intent, which is that the jar comes out of the outage
exactly as it went in.

**Decision**: re-assert with the full configured attribute set. The value written
is the raw signed cookie exactly as presented, so no re-signing is needed and the
`secret` is not required at the response site.

---

## R12 — Where the shared factory belongs, and what it must not become

`src/core/*` is the constitution's home for cross-cutting core concerns
(Architecture Standards §1). `src/core/cache/` is owned by the `redis@3.1.2` cache
client. A sibling `src/core/redis/` for the `ioredis` clients keeps the two
libraries' very different failure semantics apart while making the naming
symmetry obvious.

**A common abstraction over both libraries is explicitly rejected.** The cache
factory's guarantees are built on `redis@3.1.2` quirks that are false for
`ioredis`: that a socket failure surfaces as `reconnecting` rather than `error`
when a `retry_strategy` is set; that `connect_timeout` doubles as the total retry
budget; that `retry_strategy` returning a non-number is a permanent give-up. None
of those apply here. A shared base class would be an abstraction over a
coincidence of naming.

`CacheConnectionReporter` is therefore mirrored rather than reused — ~40 lines,
`LogContext.CACHE` → `LogContext.AUTH`, and parameterised by a client label so two
clients report independently (Clarification Q9). `src/core/cache/` is not modified
by this feature at all, which also keeps the diff reviewable against a file merged
the same day.

---

## R13 — What must not change

Verified by reading `107-oidc-session-revocation` and its tests:

- tombstone → `CookieSessionInvalidError('refresh_teardown')` → 401 + cookie clear;
- subject-revocation marker → 401, plus the one-shot `retireRevokedSession`;
- absolute-TTL ceiling → 401;
- the unawaited self-healing index write;
- the request-scoped `ActorContext` copy carrying `expiry` / `absoluteExpiry` /
  `issuedAt`;
- `/api/auth/oidc/{login,callback,logout}` continuing as anonymous after a
  rejected cookie session.

All of these live **after** the `sessionStore.get` that D1's gate protects, and
none is reached on a cookie-less request today (the store returns `null` and the
strategy returns `null` before any of them). So gating the lookup on cookie
presence changes the *path* to those behaviours and not the behaviours themselves.
SC-008 is the check that this reasoning held.
