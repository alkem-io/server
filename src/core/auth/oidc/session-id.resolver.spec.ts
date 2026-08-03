import { createHmac } from 'crypto';
import { resolveCookieSessionId } from './session-id.resolver';

/**
 * Regression coverage for defect D1 of alkem-io/server#6332 — contract
 * obligations S1..S9 of `contracts/session-id-resolution.md`.
 *
 * On `develop` @ caa1a0d33 this module does not exist and the strategy reads
 * `req.sessionID` unconditionally, so every one of these cases would have
 * produced a session-store lookup. FR-031.
 */
describe('resolveCookieSessionId', () => {
  const COOKIE = 'alkemio_session';
  const SID = 'sid-abc123';

  /** The wire form express-session writes: `s:<sid>.<hmac>`. */
  const signed = (sid: string, secret = 'k'): string =>
    `s:${sid}.${createHmac('sha256', secret).update(sid).digest('base64').replace(/=+$/, '')}`;

  describe('no store read without a presented cookie (G1 / FR-001)', () => {
    it('S1 — returns null when the request carries no cookies at all', () => {
      expect(resolveCookieSessionId({ sessionID: SID }, COOKIE)).toBeNull();
    });

    it('S2 — returns null when the cookie jar is empty', () => {
      expect(
        resolveCookieSessionId({ sessionID: SID, cookies: {} }, COOKIE)
      ).toBeNull();
    });

    it('returns null when a DIFFERENT cookie is present', () => {
      expect(
        resolveCookieSessionId(
          { sessionID: SID, cookies: { some_other_cookie: 'value' } },
          COOKIE
        )
      ).toBeNull();
    });

    // This is the whole point: express-session hands us a freshly generated
    // sessionID on every cookie-less request, and it is indistinguishable by
    // shape from a real one. Trusting it is what made anonymous traffic depend
    // on Redis.
    it('ignores a well-formed sessionID when no cookie accounts for it', () => {
      expect(
        resolveCookieSessionId(
          { sessionID: 'a-perfectly-plausible-generated-id', cookies: {} },
          COOKIE
        )
      ).toBeNull();
    });
  });

  describe('the happy path (decision row 3)', () => {
    it('S3 — returns the sid when the signed cookie accounts for it', () => {
      expect(
        resolveCookieSessionId(
          { sessionID: SID, cookies: { [COOKIE]: signed(SID) } },
          COOKIE
        )
      ).toBe(SID);
    });

    it('returns req.sessionID itself, never a value parsed out of the cookie', () => {
      // The returned value must be the id express-session produced by
      // UNSIGNING, not bytes lifted from the wire. Same string here by
      // construction; the assertion documents which one is authoritative.
      const req = { sessionID: SID, cookies: { [COOKIE]: signed(SID) } };
      expect(resolveCookieSessionId(req, COOKIE)).toBe(req.sessionID);
    });
  });

  describe('the sid must DERIVE from the presented cookie (G2 / FR-004, FR-005)', () => {
    it('S4 — returns null when the cookie names a different session', () => {
      // The forgery case. A caller presenting `s:<victim-sid>.<garbage>` must
      // not get the victim's key read. express-session rejects the signature
      // and generates a fresh sid, and the prefix check then fails.
      expect(
        resolveCookieSessionId(
          { sessionID: SID, cookies: { [COOKIE]: signed('victim-sid') } },
          COOKIE
        )
      ).toBeNull();
    });

    it('S5 — returns null when the cookie is present but sessionID is absent', () => {
      // A WebSocket upgrade whose middleware replay has not run: nothing has
      // verified anything, so there is no key we are entitled to read.
      expect(
        resolveCookieSessionId({ cookies: { [COOKIE]: signed(SID) } }, COOKIE)
      ).toBeNull();
    });

    it('returns null when sessionID is present but empty', () => {
      expect(
        resolveCookieSessionId(
          { sessionID: '', cookies: { [COOKIE]: signed(SID) } },
          COOKIE
        )
      ).toBeNull();
    });

    it('returns null when sessionID is not a string', () => {
      expect(
        resolveCookieSessionId(
          { sessionID: 12345, cookies: { [COOKIE]: signed(SID) } },
          COOKIE
        )
      ).toBeNull();
    });

    it('S6 — returns null for a cookie without the `s:` prefix', () => {
      // The legacy/unsigned shape. Notably this is what the OLD fallback would
      // have used verbatim as a Redis lookup key.
      expect(
        resolveCookieSessionId(
          { sessionID: SID, cookies: { [COOKIE]: SID } },
          COOKIE
        )
      ).toBeNull();
    });

    it('S7 — returns null for `s:<sid>` with no `.` separator', () => {
      expect(
        resolveCookieSessionId(
          { sessionID: SID, cookies: { [COOKIE]: `s:${SID}` } },
          COOKIE
        )
      ).toBeNull();
    });

    it('S8 — returns null when sessionID is a strict PREFIX of the cookie sid', () => {
      // Why the trailing '.' in the prefix test is load-bearing: without it,
      // `s:sid-abc1234.<sig>` would satisfy a check for sid `sid-abc123`.
      expect(
        resolveCookieSessionId(
          { sessionID: SID, cookies: { [COOKIE]: signed(`${SID}4`) } },
          COOKIE
        )
      ).toBeNull();
    });
  });

  describe('cookie source fallback (G4)', () => {
    it('S9 — falls back to the raw Cookie header when req.cookies is absent', () => {
      // Without this, removing or reordering cookie-parser would silently make
      // EVERY request anonymous rather than failing loudly — trading one
      // outage for a quieter one.
      expect(
        resolveCookieSessionId(
          {
            sessionID: SID,
            headers: { cookie: `other=1; ${COOKIE}=${signed(SID)}; last=2` },
          },
          COOKIE
        )
      ).toBe(SID);
    });

    it('URL-decodes the header value', () => {
      expect(
        resolveCookieSessionId(
          {
            sessionID: SID,
            headers: {
              cookie: `${COOKIE}=${encodeURIComponent(signed(SID))}`,
            },
          },
          COOKIE
        )
      ).toBe(SID);
    });

    it('does not match a cookie whose name merely ends with the target', () => {
      expect(
        resolveCookieSessionId(
          {
            sessionID: SID,
            headers: { cookie: `not_${COOKIE}=${signed(SID)}` },
          },
          COOKIE
        )
      ).toBeNull();
    });

    it('returns null when neither source carries the cookie', () => {
      expect(
        resolveCookieSessionId(
          { sessionID: SID, cookies: {}, headers: { cookie: 'a=1; b=2' } },
          COOKIE
        )
      ).toBeNull();
    });
  });

  describe('purity (G5)', () => {
    it('never throws on malformed input', () => {
      expect(() =>
        resolveCookieSessionId(
          { sessionID: SID, cookies: { [COOKIE]: 42 as unknown as string } },
          COOKIE
        )
      ).not.toThrow();
      expect(() => resolveCookieSessionId({}, COOKIE)).not.toThrow();
    });

    it('does not mutate the request', () => {
      const req = { sessionID: SID, cookies: { [COOKIE]: signed(SID) } };
      const before = JSON.stringify(req);
      resolveCookieSessionId(req, COOKIE);
      expect(JSON.stringify(req)).toBe(before);
    });
  });
});
