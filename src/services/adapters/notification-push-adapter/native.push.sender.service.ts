import http2 from 'node:http2';
import { LogContext } from '@common/enums';
import { BaseExceptionInternal } from '@common/exceptions/internal/base.exception.internal';
import { DevicePushTokenService } from '@domain/device-push-token/device.push.token.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { importPKCS8, SignJWT } from 'jose';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NativePushNotificationMessage } from './push.notification.message';

/**
 * The only two hosts Apple has, keyed by the only two values
 * `notifications.push.apns.environment` accepts.
 *
 * A CLOSED ENUM rather than a configurable `host:` URL, and that is the whole
 * point: an iOS token minted against one Apple environment answers `400
 * BadDeviceToken` on the other, which `sendApns` below treats as PERMANENT and
 * responds to by DELETING the token row — while logging only at `verbose`,
 * which production (`LOGGING_LEVEL_CONSOLE: warn`) does not emit. A typo'd URL
 * would therefore be both destructive and invisible. Two accepted spellings
 * turn that same typo into a startup failure instead.
 *
 * Unset resolves to `sandbox`, so every deployment that never sets it keeps
 * exactly today's behaviour.
 */
const APNS_HOSTS = {
  sandbox: 'https://api.sandbox.push.apple.com',
  production: 'https://api.push.apple.com',
} as const;
/**
 * `node:http2` applies NO connect or request timeout of its own, and a hung
 * connect holds one of the shared queue's 10 prefetch slots forever — ten of
 * them starve live WEB push for every other recipient. Destroying with an
 * Error makes it reject out of `send()` in the network-error shape FR-008
 * already routes to log-and-drop.
 */
const APNS_SESSION_TIMEOUT_MS = 5000;

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
/**
 * `sendFcm` goes over global `fetch`, so it cannot wait FOREVER the way
 * `node:http2` can — which is why CMP-505 put the session timeout on the APNs
 * leg only. But "not forever" is not "bounded": undici's defaults are 300 s
 * per phase (`headersTimeout`/`bodyTimeout`) across TWO sequential requests,
 * so a stalled Google endpoint holds one of the shared
 * `alkemio-push-notifications` queue's 10 prefetch slots for minutes and
 * delays live WEB push behind it — the same starvation
 * `APNS_SESSION_TIMEOUT_MS` exists for.
 *
 * The number deliberately differs from the APNs literal. `session.setTimeout`
 * is an INACTIVITY timer on a session doing one round trip, whereas
 * `AbortSignal.timeout` bounds TOTAL elapsed time including TLS setup — so
 * reusing 5 s would make this leg strictly tighter than the one it is matching
 * and turn slow successes into drops. An abort rejects out of `send()` in the
 * same network-error shape FR-008 already routes to log-and-drop, owned by the
 * single boundary catch, so the taxonomy gains no arm.
 */
const FCM_REQUEST_TIMEOUT_MS = 10000;

/**
 * 086-app-push-mvp (FR-007, FR-008). Sends an already-rendered notification to
 * one device token, over APNs (iOS) or FCM HTTP v1 (Android).
 *
 * There is deliberately NO per-send `try/catch` here: `send()` may reject (a
 * present-but-malformed credential makes `jose` throw), and the single owner of
 * "a throw must not escape the queue handler" is the native branch's boundary
 * catch in `PushDeliveryService.handlePushMessage`. This service has exactly
 * one call site, so one boundary covers every cause.
 */
@Injectable()
export class NativePushSenderService {
  private readonly apnsKeyBase64: string;
  private readonly apnsKeyId: string;
  private readonly apnsTeamId: string;
  private readonly apnsBundleId: string;
  private readonly apnsHost: string;
  private readonly fcmProjectId: string;
  private readonly fcmServiceAccountBase64: string;

  constructor(
    private devicePushTokenService: DevicePushTokenService,
    private configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.apnsKeyBase64 = this.configService.get(
      'notifications.push.apns.key_base64' as any
    );
    this.apnsKeyId = this.configService.get(
      'notifications.push.apns.key_id' as any
    );
    this.apnsTeamId = this.configService.get(
      'notifications.push.apns.team_id' as any
    );
    this.apnsBundleId = this.configService.get(
      'notifications.push.apns.bundle_id' as any
    );
    // Validated HERE, at construction, so a typo fails startup rather than
    // quietly deleting iOS tokens at the first send.
    this.apnsHost = NativePushSenderService.resolveApnsHost(
      this.configService.get('notifications.push.apns.environment' as any)
    );
    this.fcmProjectId = this.configService.get(
      'notifications.push.fcm.project_id' as any
    );
    this.fcmServiceAccountBase64 = this.configService.get(
      'notifications.push.fcm.service_account_base64' as any
    );
  }

  async send(message: NativePushNotificationMessage): Promise<void> {
    if (message.platform === 'ios') {
      return this.sendApns(message);
    }
    return this.sendFcm(message);
  }

  private async sendApns(
    message: NativePushNotificationMessage
  ): Promise<void> {
    // A falsy conjunction over EVERY key APNs needs: an unset variable with an
    // empty default resolves to the NUMBER 0, so `typeof === 'string'` would
    // treat an absent credential as present and sign with 0.
    if (
      !this.apnsKeyBase64 ||
      !this.apnsKeyId ||
      !this.apnsTeamId ||
      !this.apnsBundleId
    ) {
      this.logger.warn?.(
        {
          message:
            'APNs credentials absent (notifications.push.apns.{key_base64,key_id,team_id,bundle_id}); native iOS push disabled',
        },
        LogContext.PUSH_NOTIFICATION
      );
      return;
    }

    const privateKey = await importPKCS8(
      Buffer.from(this.apnsKeyBase64, 'base64').toString('utf8'),
      'ES256'
    );
    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: this.apnsKeyId })
      .setIssuer(this.apnsTeamId)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

    const session = http2.connect(this.apnsHost);
    session.setTimeout(APNS_SESSION_TIMEOUT_MS, () =>
      session.destroy(new Error('APNs timeout'))
    );

    let status = 0;
    let body = '';
    try {
      await new Promise<void>((resolve, reject) => {
        session.on('error', reject);
        const request = session.request({
          ':method': 'POST',
          ':path': `/3/device/${message.token}`,
          'apns-topic': this.apnsBundleId,
          // HTTP/2 field names MUST be lowercase and `session.request` does
          // not lowercase for you; `bearer` is APNs' own spelling.
          authorization: `bearer ${jwt}`,
        });
        request.on('response', headers => {
          status = Number(headers[':status']);
        });
        request.on('data', chunk => {
          body += String(chunk);
        });
        request.on('end', resolve);
        request.on('error', reject);
        request.end(
          JSON.stringify({
            aps: {
              alert: {
                title: message.payload.title,
                body: message.payload.body,
              },
            },
          })
        );
      });
    } finally {
      session.close();
    }

    // FR-008: exactly two permanent codes, both APNs.
    const permanent =
      status === 410 ||
      (status === 400 &&
        (JSON.parse(body) as { reason?: string }).reason === 'BadDeviceToken');
    if (permanent) {
      await this.devicePushTokenService.deleteByToken(message.token);
      this.logger.verbose?.(
        {
          message:
            'Native push token rejected as permanently dead; row deleted',
          platform: message.platform,
          status,
        },
        LogContext.PUSH_NOTIFICATION
      );
      return;
    }

    if (status >= 200 && status < 300) {
      this.logDelivered(message);
      return;
    }

    this.logger.warn?.(
      {
        message: 'APNs rejected the push; dropping and keeping the token',
        status,
        body,
      },
      LogContext.PUSH_NOTIFICATION
    );
  }

  private async sendFcm(message: NativePushNotificationMessage): Promise<void> {
    if (!this.fcmProjectId || !this.fcmServiceAccountBase64) {
      this.logger.warn?.(
        {
          message:
            'FCM credentials absent (notifications.push.fcm.{project_id,service_account_base64}); native Android push disabled',
        },
        LogContext.PUSH_NOTIFICATION
      );
      return;
    }

    const serviceAccount = JSON.parse(
      Buffer.from(this.fcmServiceAccountBase64, 'base64').toString('utf8')
    ) as { client_email: string; private_key: string };

    const assertion = await new SignJWT({ scope: FCM_SCOPE })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer(serviceAccount.client_email)
      .setAudience(GOOGLE_TOKEN_ENDPOINT)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(await importPKCS8(serviceAccount.private_key, 'RS256'));

    const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }).toString(),
      signal: AbortSignal.timeout(FCM_REQUEST_TIMEOUT_MS),
    });
    if (!tokenResponse.ok) {
      // FR-008: a failed exchange logs and drops, and touches no row.
      this.logger.warn?.(
        {
          message: 'FCM access token exchange failed; dropping the push',
          status: tokenResponse.status,
        },
        LogContext.PUSH_NOTIFICATION
      );
      return;
    }
    const { access_token: accessToken } = (await tokenResponse.json()) as {
      access_token: string;
    };

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${this.fcmProjectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            // The HTTP v1 recipient field. Without it there is no target at
            // all and FCM answers 400 INVALID_ARGUMENT.
            token: message.token,
            notification: {
              title: message.payload.title,
              body: message.payload.body,
            },
            data: { url: message.payload.url },
          },
        }),
        signal: AbortSignal.timeout(FCM_REQUEST_TIMEOUT_MS),
      }
    );

    if (!response.ok) {
      // NO FCM outcome deletes a row (FR-008): `UNREGISTERED` is a nested
      // `error.details[].errorCode`, and its nearest status, NOT_FOUND, also
      // answers a wrong project_id — which would wipe every Android binding in
      // a fan-out. Reclamation is deferred.
      this.logger.warn?.(
        {
          message: 'FCM rejected the push; dropping and keeping the token',
          status: response.status,
        },
        LogContext.PUSH_NOTIFICATION
      );
      return;
    }

    this.logDelivered(message);
  }

  /**
   * Maps `notifications.push.apns.environment` onto one of Apple's two hosts,
   * rejecting anything else LOUDLY.
   */
  private static resolveApnsHost(environment: unknown): string {
    // An unset variable with an empty default resolves to the NUMBER 0 in this
    // config loader (see `sendApns`), so treat every falsy reading as "not
    // configured" and keep the sandbox host every current deployment uses.
    if (!environment) {
      return APNS_HOSTS.sandbox;
    }
    if (environment !== 'sandbox' && environment !== 'production') {
      throw new BaseExceptionInternal(
        'notifications.push.apns.environment must be either "sandbox" or "production"',
        LogContext.PUSH_NOTIFICATION,
        { environment }
      );
    }
    return APNS_HOSTS[environment];
  }

  private logDelivered(message: NativePushNotificationMessage): void {
    this.logger.verbose?.(
      {
        message: 'Native push delivered',
        platform: message.platform,
        eventType: message.payload.eventType,
      },
      LogContext.PUSH_NOTIFICATION
    );
  }
}
