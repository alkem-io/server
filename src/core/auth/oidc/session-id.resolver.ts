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
  const raw = readRawCookie(req, cookieName);
  if (!raw) {
    // No cookie presented: rows 1 and 4 of the decision table. This single
    // branch is the whole of FR-001, and the reason a Redis outage stops being
    // a total outage — anonymous traffic no longer depends on Redis at all.
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
 * Cookie presence from the parsed cookies, with the raw header as a fallback.
 *
 * `req.cookies` is populated by `cookie-parser`, which `main.server.ts`
 * registers before the session middleware and replays onto WebSocket upgrades.
 * The fallback exists so that removing or reordering `cookie-parser` fails
 * LOUDLY rather than silently making every request anonymous — a resilience fix
 * that introduces a silent total-auth-outage mode would be a poor trade. It is
 * also what `express-session` itself treats as authoritative.
 */
const readRawCookie = (
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
    const value = decodeURIComponent(part.slice(separator + 1).trim());
    return value.length > 0 ? value : null;
  }

  return null;
};
