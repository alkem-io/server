/**
 * May this request read the session store, and with what key?
 *
 * Background — alkem-io/server#6332 defect 1. `express-session` assigns
 * `req.sessionID` on EVERY request: when no session cookie was sent it
 * generates a fresh random one, and `saveUninitialized: false` controls only
 * whether that session is later PERSISTED, not whether the id is generated. A
 * consumer that reads `req.sessionID` therefore cannot distinguish a real
 * session id from one express-session invented microseconds earlier, and issues
 * a store lookup for a key that cannot exist.
 *
 * While Redis is healthy that is invisible — a wasted GET returning null,
 * followed by a correct degradation to anonymous. While Redis is down it
 * throws, and a request that needed no session at all fails. That is the
 * difference between "signed-in users cannot authenticate" and "the platform is
 * down". Spec FR-001..FR-005.
 *
 * This function exists because the answer was already given correctly in one
 * place (`forward-auth.resolver.service.ts`) and incorrectly in the place that
 * mattered most — the strategy, on the path every request takes. Research R8.
 */

/**
 * The sid the session store may be read with, or `null` when the request has
 * not earned a store read.
 *
 * `null` is NOT an error. It means "this request is anonymous as far as the
 * session layer is concerned", and the caller must resolve it as such WITHOUT
 * touching the store.
 */
export const resolveCookieSessionId = (
  req: {
    sessionID?: unknown;
    cookies?: Record<string, unknown>;
    headers?: { cookie?: string };
  },
  cookieName: string
): string | null => {
  const raw = readPresentedCookie(req, cookieName);
  if (!raw) {
    // No cookie presented: row 1 of the decision table (rows 2 and 4 are
    // handled below). This single branch is the whole of FR-001, and the reason
    // a Redis outage stops being a total outage — anonymous traffic no longer
    // depends on Redis at all.
    return null;
  }

  const sid = req.sessionID;
  if (typeof sid !== 'string' || sid.length === 0) {
    // A cookie arrived but the session middleware has not run — e.g. a
    // WebSocket upgrade whose middleware replay has not happened. Nothing has
    // verified anything, so there is no key we are entitled to read.
    return null;
  }

  // The predicate. `express-session` writes the cookie as
  // `'s:' + signature.sign(sid, secret)`, and `cookie-signature`'s `sign`
  // returns `val + '.' + hmac`. So this prefix test is exactly "the middleware
  // derived THIS sid from THIS cookie" — computed without the signing key and
  // without adding `cookie-signature` as a direct dependency.
  //
  // The trailing '.' is load-bearing: without it a sid that is a strict prefix
  // of another sid would match.
  //
  // Note what this deliberately does NOT do: parse the sid out of the raw
  // `s:<sid>.<sig>` value. That reads as equivalent and is a session-forgery
  // vector, because it skips signature verification entirely — a caller could
  // present `s:<victim-sid>.<garbage>` and have the victim's key read. We only
  // ever RETURN `req.sessionID`, which express-session produced by UNSIGNING
  // the cookie with the server's secret; `raw` is used solely as a predicate.
  // Spec FR-004, research R7.
  return raw.startsWith(`s:${sid}.`) ? sid : null;
};

/**
 * The presented cookie value, from the parsed cookies, with the raw header as a
 * fallback. `null` when the request did not carry it.
 *
 * `req.cookies` is populated by `cookie-parser`, which `main.server.ts`
 * registers before the session middleware and replays onto WebSocket upgrades.
 * The fallback exists so that removing or reordering `cookie-parser` fails
 * LOUDLY rather than silently making every request anonymous — a resilience fix
 * that introduces a silent total-auth-outage mode would be a poor trade. It is
 * also what `express-session` itself treats as authoritative.
 *
 * Exported because the store-unavailable response site
 * (`cookie-session.exception-filter.ts`) has to answer the SAME question when
 * it re-asserts the cookie: reading only `req.cookies` there would silently
 * drop the `Set-Cookie` on exactly the requests this fallback exists to keep
 * working, which is the "session ended" wire shape FR-020 forbids.
 */
export const readPresentedCookie = (
  req: {
    cookies?: Record<string, unknown>;
    headers?: { cookie?: string };
  },
  cookieName: string
): string | null => {
  const parsed = req.cookies?.[cookieName];
  if (typeof parsed === 'string' && parsed.length > 0) {
    return parsed;
  }

  const header = req.headers?.cookie;
  if (typeof header !== 'string' || header.length === 0) {
    return null;
  }

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) {
      continue;
    }
    if (part.slice(0, separator).trim() !== cookieName) {
      continue;
    }
    const value = decodeCookieValue(part.slice(separator + 1).trim());
    return value.length > 0 ? value : null;
  }

  return null;
};

/**
 * Percent-decode a cookie value, never throwing.
 *
 * `decodeURIComponent` raises `URIError` on malformed input — `%zz`, a trailing
 * `%`, a truncated multi-byte sequence. This runs on the path EVERY request
 * takes, so an unguarded decode lets any client turn a malformed `Cookie`
 * header into a 500. On a change whose whole thesis is "degrade, do not
 * reject", that would be this issue's own defect reintroduced one function
 * along.
 *
 * The fallback is the RAW value, not `null`. `express-session` parses this same
 * header with the `cookie` package, whose `tryDecode` returns the undecoded
 * string on exactly this failure, so returning raw keeps our predicate agreeing
 * with the middleware whose `sessionID` we are testing against. Returning
 * `null` would instead make a request anonymous that express-session had
 * already authenticated — the silent total-auth-outage mode that the header
 * fallback in `readRawCookie` exists specifically to avoid.
 *
 * No forgery surface is added: this value is only ever used as a PREDICATE, and
 * the sid returned to callers is always `req.sessionID`. See
 * `resolveCookieSessionId`.
 */
const decodeCookieValue = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};
