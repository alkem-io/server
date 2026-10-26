import { generateKeyPairSync } from 'node:crypto';
import { EventEmitter } from 'node:events';
import http2 from 'node:http2';
import { LogContext } from '@common/enums';
import { DevicePushTokenService } from '@domain/device-push-token/device.push.token.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NativePushSenderService } from './native.push.sender.service';
import { NativePushNotificationMessage } from './push.notification.message';

/**
 * REAL keys, not a mocked `jose`: the ES256/RS256 signing these senders do is
 * part of what must work, and a stubbed signer cannot tell a usable credential
 * from an unusable one — which is exactly what the last case below asserts.
 */
const pkcs8 = (type: 'ec' | 'rsa') =>
  (type === 'ec'
    ? generateKeyPairSync('ec', { namedCurve: 'P-256' })
    : generateKeyPairSync('rsa', { modulusLength: 2048 })
  ).privateKey
    .export({ type: 'pkcs8', format: 'pem' })
    .toString();

/**
 * The repo runs vitest with `isolate: false` (one shared module cache per
 * worker), so `vi.mock` of a module another spec already imported is
 * unreliable — and a miss here would reach the real APNs host. Spy on the
 * module object the sender reads at call time instead, the way the sibling
 * `push.delivery.service.spec.ts` spies on `webpush.sendNotification`.
 */
const connectSpy = vi.spyOn(http2, 'connect');

const mockDevicePushTokenService = {
  deleteByToken: vi.fn(),
};

const mockLogger = {
  verbose: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
};

const FULL_CONFIG: Record<string, string> = {
  'notifications.push.apns.key_base64': Buffer.from(pkcs8('ec')).toString(
    'base64'
  ),
  'notifications.push.apns.key_id': 'KEYID123',
  'notifications.push.apns.team_id': 'TEAMID456',
  'notifications.push.apns.bundle_id': 'io.alkem.app.sandbox',
  'notifications.push.fcm.project_id': 'alkemio-sandbox',
  'notifications.push.fcm.service_account_base64': Buffer.from(
    JSON.stringify({
      client_email: 'push@alkemio-sandbox.iam.gserviceaccount.com',
      private_key: pkcs8('rsa'),
    })
  ).toString('base64'),
};

const createService = (config: Record<string, string> = FULL_CONFIG) =>
  new NativePushSenderService(
    mockDevicePushTokenService as unknown as DevicePushTokenService,
    { get: (key: string) => config[key] } as any,
    mockLogger as any
  );

const createMessage = (
  overrides?: Partial<NativePushNotificationMessage>
): NativePushNotificationMessage => ({
  userId: 'user-1',
  platform: 'ios',
  token: 'device-token-1',
  payload: {
    title: 'Alice mentioned you',
    body: 'in “Space — Café ☕”',
    // A realistic value: `urlGeneratorService` emits an ABSOLUTE url rooted at
    // `hosting.endpoint_cluster` for every deep link. A relative fixture would
    // have had the on-device consumer written against a shape that never occurs.
    url: 'https://alkem.io/spaces/alpha',
    eventType: 'USER_MENTIONED',
    timestamp: '2026-10-16T10:00:00.000Z',
  },
  ...overrides,
});

/** An APNs HTTP/2 session whose request answers with `status` and `body`. */
const stubApnsSession = (status: number, body = '') => {
  const request: any = new EventEmitter();
  request.end = vi.fn(() => {
    queueMicrotask(() => {
      request.emit('response', { ':status': status });
      if (body) request.emit('data', body);
      request.emit('end');
    });
  });

  const session: any = new EventEmitter();
  session.request = vi.fn(() => request);
  session.setTimeout = vi.fn();
  session.close = vi.fn();
  session.destroy = vi.fn();

  connectSpy.mockReturnValue(session);
  return { session, request };
};

/** An APNs session whose request fails at the socket. */
const stubApnsNetworkError = () => {
  const request: any = new EventEmitter();
  request.end = vi.fn(() => {
    queueMicrotask(() => request.emit('error', new Error('socket hang up')));
  });

  const session: any = new EventEmitter();
  session.request = vi.fn(() => request);
  session.setTimeout = vi.fn();
  session.close = vi.fn();
  session.destroy = vi.fn();

  connectSpy.mockReturnValue(session);
  return session;
};

const mockFetch = vi.fn();

/** The OAuth exchange, then the `messages:send` call. */
const stubFcmResponses = (sendResponse: { ok: boolean; status: number }) => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ access_token: 'access-token-abc' }),
  });
  mockFetch.mockResolvedValueOnce(sendResponse);
};

describe('NativePushSenderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
  });

  describe('the outgoing request shape (SC-007, FR-007)', () => {
    it('sends an iOS message to APNs with a signed, lowercase authorization header on a bounded session', async () => {
      const { session, request } = stubApnsSession(200);

      await createService().send(createMessage());

      // No `notifications.push.apns.environment` in this mock config, i.e.
      // the absent-key safety net: the SANDBOX host. (A real deployment that
      // leaves APNS_ENVIRONMENT unset gets the STRING 'sandbox' from
      // alkemio.yml's own default — covered below and in
      // `src/config/push-notifications.config.spec.ts`.)
      expect(connectSpy).toHaveBeenCalledWith(
        'https://api.sandbox.push.apple.com'
      );

      const headers = session.request.mock.calls[0][0];
      expect(headers[':method']).toBe('POST');
      expect(headers[':path']).toBe('/3/device/device-token-1');
      expect(headers['apns-topic']).toBe('io.alkem.app.sandbox');
      // HTTP/2 rejects a capitalised field name and `session.request` does not
      // lowercase it for you; APNs spells the scheme `bearer`.
      expect(Object.keys(headers)).toContain('authorization');
      expect(headers.authorization).toMatch(/^bearer /);

      // The stream must be ended or APNs never answers.
      expect(request.end).toHaveBeenCalledTimes(1);

      // `node:http2` applies no timeout of its own, and a hung connect holds
      // one of the shared queue's 10 prefetch slots forever.
      expect(session.setTimeout).toHaveBeenCalledWith(
        5000,
        expect.any(Function)
      );
      session.setTimeout.mock.calls[0][1]();
      expect(session.destroy).toHaveBeenCalledWith(expect.any(Error));
    });

    it('sends an Android message to FCM HTTP v1 with the token as the recipient and a bearer credential', async () => {
      stubFcmResponses({ ok: true, status: 200 });

      await createService().send(
        createMessage({ platform: 'android', token: 'android-token-9' })
      );

      const [exchangeUrl, exchangeInit] = mockFetch.mock.calls[0];
      expect(exchangeUrl).toBe('https://oauth2.googleapis.com/token');
      expect(String(exchangeInit.body)).toContain(
        encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')
      );

      const [sendUrl, sendInit] = mockFetch.mock.calls[1];
      expect(sendUrl).toBe(
        'https://fcm.googleapis.com/v1/projects/alkemio-sandbox/messages:send'
      );
      // Without the credential header FCM answers 401/403, which FR-008 logs
      // and drops — Android push silently 100% dead.
      expect(sendInit.headers).toMatchObject({
        Authorization: 'Bearer access-token-abc',
        'Content-Type': 'application/json',
      });
      // BOTH Google requests must be bounded. `fetch` is not unbounded the way
      // `node:http2` is, but undici's own defaults are 300 s per phase over two
      // sequential requests, so a stalled endpoint holds one of the shared
      // queue's 10 prefetch slots for minutes — the same starvation the APNs
      // session timeout above exists for.
      expect(exchangeInit.signal).toBeInstanceOf(AbortSignal);
      expect(sendInit.signal).toBeInstanceOf(AbortSignal);

      const body = JSON.parse(sendInit.body);
      // `message.token` is the HTTP v1 recipient field: without it there is no
      // target at all and FCM answers 400 INVALID_ARGUMENT.
      expect(body.message.token).toBe('android-token-9');
      expect(body.message.notification).toEqual({
        title: 'Alice mentioned you',
        body: 'in “Space — Café ☕”',
      });
      expect(connectSpy).not.toHaveBeenCalled();
    });
  });

  it('forwards the ALREADY-RENDERED title and body unmodified on both transports', async () => {
    const { request } = stubApnsSession(200);
    await createService().send(createMessage());

    expect(JSON.parse(request.end.mock.calls[0][0])).toEqual({
      aps: {
        alert: {
          title: 'Alice mentioned you',
          body: 'in “Space — Café ☕”',
        },
      },
      // The tap target rides alongside `aps`, never inside it — asserted for
      // its POSITION in the dedicated case below.
      url: 'https://alkem.io/spaces/alpha',
    });

    stubFcmResponses({ ok: true, status: 200 });
    await createService().send(createMessage({ platform: 'android' }));

    const body = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(body.message.notification.title).toBe('Alice mentioned you');
    expect(body.message.notification.body).toBe('in “Space — Café ☕”');
  });

  /**
   * FR-007. The deep link must arrive under the SAME JS field path on both
   * platforms, or a client written once works on exactly one of them.
   * Capacitor's iOS plugin copies the WHOLE APNs `userInfo` dictionary into
   * the JS event's `data` (`PushNotificationsHandler.swift:90`), so the key
   * has to be a TOP-LEVEL sibling of `aps`: inside `aps` it would be an
   * illegal Apple key, and wrapped in a `data` object it would surface as
   * `notification.data.data.url`.
   *
   * The assertions therefore check the key's POSITION, not its presence — a
   * substring check on the serialized body would pass for every one of those
   * wrong shapes, which is the exact defect that matters here.
   */
  it('carries the tap target at the identical on-device field path on both transports (FR-007)', async () => {
    const { request } = stubApnsSession(200);
    await createService().send(createMessage());

    const apnsBody = JSON.parse(request.end.mock.calls[0][0]);
    // Reaches JS as `notification.data.url`.
    expect(apnsBody.url).toBe('https://alkem.io/spaces/alpha');
    // Sorted: `no extra keys` is the guarantee, not the emission order. Without
    // the sort, reordering the object literal — a pure no-op — turns this red.
    expect(Object.keys(apnsBody).sort()).toEqual(['aps', 'url']);
    // The three wrong placements, each named.
    expect(apnsBody.aps.url).toBeUndefined();
    expect(apnsBody.aps.alert.url).toBeUndefined();
    expect(apnsBody.data).toBeUndefined();
    // Delivery/presentation behaviour is untouched: `alert` and nothing else.
    // No `content-available`, `mutable-content`, `category` or `thread-id`.
    expect(Object.keys(apnsBody.aps)).toEqual(['alert']);

    stubFcmResponses({ ok: true, status: 200 });
    await createService().send(createMessage({ platform: 'android' }));

    const fcmBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    // Reaches JS as `notification.data.url` as well — the plugin nests the
    // FCM data map under `data` on both the foreground and the tap path.
    expect(fcmBody.message.data).toEqual({
      url: 'https://alkem.io/spaces/alpha',
    });
  });

  /**
   * FR-007, the value's FORM. `url` is NOT one shape: `urlGeneratorService`
   * returns an absolute `hosting.endpoint_cluster`-rooted url for a deep link
   * (`url.generator.service.ts:44,54`) but the bare string `'/'` for the
   * home-link events (`:1435`). The transport must pass BOTH through
   * untouched — no normalization, no prefixing, no trailing-slash tidying —
   * because the on-device consumer is what resolves them, and a transport
   * that "helpfully" rewrote one of these would move that bug out of reach of
   * every server test.
   */
  it.each([
    ['an absolute deep link', 'https://alkem.io/spaces/alpha/callouts/7'],
    ['the bare home link', '/'],
  ])('passes %s through to both transports verbatim (FR-007)', async (_label, url) => {
    const { request } = stubApnsSession(200);
    await createService().send(
      createMessage({ payload: { ...createMessage().payload, url } })
    );
    expect(JSON.parse(request.end.mock.calls[0][0]).url).toBe(url);

    stubFcmResponses({ ok: true, status: 200 });
    await createService().send(
      createMessage({
        platform: 'android',
        payload: { ...createMessage().payload, url },
      })
    );
    expect(JSON.parse(mockFetch.mock.calls[1][1].body).message.data).toEqual({
      url,
    });
  });

  describe('the error taxonomy (FR-008)', () => {
    // Exactly two permanent codes, both APNs.
    it('deletes the row on APNs 410', async () => {
      stubApnsSession(410, JSON.stringify({ reason: 'Unregistered' }));

      await createService().send(createMessage());

      expect(mockDevicePushTokenService.deleteByToken).toHaveBeenCalledWith(
        'device-token-1'
      );
    });

    it('deletes the row on APNs 400 BadDeviceToken', async () => {
      stubApnsSession(400, JSON.stringify({ reason: 'BadDeviceToken' }));

      await createService().send(createMessage());

      expect(mockDevicePushTokenService.deleteByToken).toHaveBeenCalledWith(
        'device-token-1'
      );
    });

    it.each([401, 403, 429, 500])('keeps the row on APNs %i', async status => {
      stubApnsSession(status, JSON.stringify({ reason: 'TooManyRequests' }));

      await createService().send(createMessage());

      expect(mockDevicePushTokenService.deleteByToken).not.toHaveBeenCalled();
    });

    it('keeps the row on a network error, and lets the rejection reach the one boundary', async () => {
      const session = stubApnsNetworkError();

      await expect(createService().send(createMessage())).rejects.toThrow(
        'socket hang up'
      );

      expect(mockDevicePushTokenService.deleteByToken).not.toHaveBeenCalled();
      expect(session.close).toHaveBeenCalled();
    });

    // NO FCM outcome deletes a row: `UNREGISTERED` is a nested
    // error.details[].errorCode, and NOT_FOUND also answers a wrong
    // project_id — which would wipe every Android binding in a fan-out.
    it.each([
      ['404 UNREGISTERED', { ok: false, status: 404 }],
      ['400 INVALID_ARGUMENT', { ok: false, status: 400 }],
      ['500', { ok: false, status: 500 }],
      ['403 PERMISSION_DENIED', { ok: false, status: 403 }],
    ])('keeps the row on FCM %s', async (_label, sendResponse) => {
      stubFcmResponses(sendResponse as { ok: boolean; status: number });

      await createService().send(createMessage({ platform: 'android' }));

      expect(mockDevicePushTokenService.deleteByToken).not.toHaveBeenCalled();
    });

    it('keeps the row and sends nothing when the FCM token exchange fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

      await createService().send(createMessage({ platform: 'android' }));

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockDevicePushTokenService.deleteByToken).not.toHaveBeenCalled();
    });
  });

  /**
   * The host is a two-value enum, NOT a URL, because `sendApns` treats `400
   * BadDeviceToken` as PERMANENT and DELETES the token row — and an iOS token
   * minted against one Apple environment answers exactly that way on the
   * other. These assert through `http2.connect`, the call that actually
   * selects the host, so restating the mapping object cannot satisfy them.
   */
  describe('the APNs host (notifications.push.apns.environment)', () => {
    it('talks to the SANDBOX host when the key is ABSENT — the safety net for an alkemio.yml predating the key', async () => {
      stubApnsSession(200);

      await createService().send(createMessage());

      expect(connectSpy).toHaveBeenCalledWith(
        'https://api.sandbox.push.apple.com'
      );
    });

    it('talks to the SANDBOX host on an explicit `sandbox` — what the YAML default resolves to, so what every existing deployment gets', async () => {
      stubApnsSession(200);

      await createService({
        ...FULL_CONFIG,
        'notifications.push.apns.environment': 'sandbox',
      }).send(createMessage());

      expect(connectSpy).toHaveBeenCalledWith(
        'https://api.sandbox.push.apple.com'
      );
    });

    it('talks to the PRODUCTION host on `production`', async () => {
      stubApnsSession(200);

      await createService({
        ...FULL_CONFIG,
        'notifications.push.apns.environment': 'production',
      }).send(createMessage());

      expect(connectSpy).toHaveBeenCalledWith('https://api.push.apple.com');
    });

    // The failure mode this enum exists for: a bad value must be a LOUD
    // startup failure, never a silent fall back to sandbox and never an
    // arbitrary URL.
    //
    // `0` is in this table on purpose and is the subtlest entry: it is what
    // the config loader yields for a PRESENT-but-BLANK `APNS_ENVIRONMENT`
    // (`'' ?? 'sandbox'` keeps `''`, then `!isNaN('')` turns it into
    // `Number('')`). A blank ConfigMap row is a misconfiguration, so it must
    // be rejected — a blanket `if (!environment)` guard would send it to
    // sandbox and silently delete every production iOS token instead.
    it.each([
      ['a typo', 'produciton'],
      ['a near-miss spelling', 'Production'],
      ['an arbitrary URL', 'https://api.push.apple.com'],
      ['a blank variable, as the loader reads it', 0],
      ['a blank variable, unconverted', ''],
    ])('REJECTS %s at construction rather than falling back', (_label, value) => {
      expect(() =>
        createService({
          ...FULL_CONFIG,
          'notifications.push.apns.environment': value as any,
        })
      ).toThrow(/notifications\.push\.apns\.environment/);

      expect(connectSpy).not.toHaveBeenCalled();
    });

    it('names both accepted values in the rejection, and carries the offending value as structured details only', () => {
      let caught: any;
      try {
        createService({
          ...FULL_CONFIG,
          'notifications.push.apns.environment': 'produciton',
        });
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeDefined();
      expect(caught.message).toContain('"sandbox"');
      expect(caught.message).toContain('"production"');
      // House rule: no dynamic data in the message.
      expect(caught.message).not.toContain('produciton');
      expect(caught.details).toEqual({ environment: 'produciton' });
    });

    /**
     * The rejection is raised from a provider CONSTRUCTOR, i.e. inside
     * `NestFactory.create`'s `ExceptionsZone`, whose only reporting is a
     * `@nestjs/common` `Logger` — and `main.server.ts` passes `logger: false`
     * under `NODE_ENV=production`, which every deployed image sets. So the
     * throw alone is MUTE in production: the diagnostic has to go through
     * winston, which writes via its own transports. Without this assertion a
     * future edit could drop that line and leave the operator a crash-loop
     * with an empty log.
     */
    it('writes the diagnostic through winston BEFORE throwing, since the throw itself is mute in a deployed image', () => {
      expect(() =>
        createService({
          ...FULL_CONFIG,
          'notifications.push.apns.environment': 'produciton',
        })
      ).toThrow();

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      const [message, , context] = mockLogger.error.mock.calls[0];
      expect(message).toContain('notifications.push.apns.environment');
      expect(message).toContain('"sandbox"');
      expect(message).toContain('"production"');
      expect(context).toBe(LogContext.PUSH_NOTIFICATION);
    });
  });

  describe('credentials (FR-007)', () => {
    it('is inert, logs once and resolves when a platform has no credentials at all', async () => {
      await expect(
        createService({}).send(createMessage())
      ).resolves.toBeUndefined();

      expect(connectSpy).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockDevicePushTokenService.deleteByToken).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn.mock.calls[0][0].message).toContain(
        'notifications.push.apns'
      );
    });

    it('is disabled when only SOME of a platform’s keys are present', async () => {
      const halfProvisioned = { ...FULL_CONFIG };
      delete halfProvisioned['notifications.push.apns.bundle_id'];

      await createService(halfProvisioned).send(createMessage());

      expect(connectSpy).not.toHaveBeenCalled();
    });

    // The normal intermediate state while HG-1 is executed: a truncated or
    // re-wrapped base64 `.p8` passes the falsy guard and makes jose throw.
    // The rejection is the caller's to handle, at the ONE boundary.
    it('rejects, sends nothing and touches no row on a present-but-malformed credential', async () => {
      const truncated = {
        ...FULL_CONFIG,
        'notifications.push.apns.key_base64': Buffer.from(
          pkcs8('ec').slice(0, 60)
        ).toString('base64'),
      };

      await expect(
        createService(truncated).send(createMessage())
      ).rejects.toThrow();

      expect(connectSpy).not.toHaveBeenCalled();
      expect(mockDevicePushTokenService.deleteByToken).not.toHaveBeenCalled();
    });
  });
});
