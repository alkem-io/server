import { generateKeyPairSync } from 'node:crypto';
import { EventEmitter } from 'node:events';
import http2 from 'node:http2';
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
    url: '/spaces/alpha',
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

      // Hard-coded SANDBOX host — FR-014 leaves no entitled production build.
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
    });

    stubFcmResponses({ ok: true, status: 200 });
    await createService().send(createMessage({ platform: 'android' }));

    const body = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(body.message.notification.title).toBe('Alice mentioned you');
    expect(body.message.notification.body).toBe('in “Space — Café ☕”');
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
