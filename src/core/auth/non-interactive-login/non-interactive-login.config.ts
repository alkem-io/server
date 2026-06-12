import { Inject, Injectable, type LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

/**
 * Defense-in-depth gate for the non-interactive-login feature.
 *
 * Reads `identity.authentication.providers.non_interactive_login` from the
 * AlkemioConfig YAML (which interpolates the
 * `ENABLE_NON_INTERACTIVE_LOGIN` / `NON_INTERACTIVE_LOGIN_SIGNING_KEY` env
 * vars). NODE_ENV stays a `process.env` read — it is a Node-level convention,
 * not part of AlkemioConfig.
 *
 * Active only when ALL hold:
 *   1. `enabled === true` in config
 *   2. `process.env.NODE_ENV !== 'production'`
 *   3. `signing_key` set and decodes to at least 32 bytes
 *
 * `assertSafe()` is called at bootstrap (main.ts). It throws if the
 * combination would be unsafe (prod + enabled, or enabled with weak key).
 * That crashes the process before any request can hit the endpoint.
 */
@Injectable()
export class NonInteractiveLoginConfig {
  public readonly enabled: boolean;
  public readonly secretKey: Uint8Array | null;
  public readonly issuer = 'alkemio-non-interactive-login';
  public readonly tokenTtlSeconds: number;

  constructor(
    private readonly configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    const cfg = this.configService.get(
      'identity.authentication.providers.non_interactive_login',
      { infer: true }
    );

    const nodeEnv = String(process.env.NODE_ENV ?? '').toLowerCase();
    const notProd = nodeEnv !== 'production';
    const keyBytes = NonInteractiveLoginConfig.decodeKey(cfg.signing_key ?? '');
    const keyOk = keyBytes !== null && keyBytes.length >= 32;

    this.enabled = Boolean(cfg.enabled) && notProd && keyOk;
    this.secretKey = this.enabled ? keyBytes : null;
    this.tokenTtlSeconds = Number.isFinite(cfg.token_ttl_s)
      ? Number(cfg.token_ttl_s)
      : 4 * 60 * 60;
  }

  /**
   * Boot-time guard. Throws to abort startup when configuration is unsafe.
   * Specifically:
   *   - production + enabled=true → refuse to start
   *   - production + signing_key present → refuse (reduces chance of misconfig)
   *   - enabled=true + missing/short key → refuse
   */
  public assertSafe(): void {
    const cfg = this.configService.get(
      'identity.authentication.providers.non_interactive_login',
      { infer: true }
    );
    const enabledFlag = Boolean(cfg.enabled);
    const nodeEnv = String(process.env.NODE_ENV ?? '').toLowerCase();
    const keyRaw = cfg.signing_key ?? '';
    const keyPresent = keyRaw.length > 0;

    if (nodeEnv === 'production' && enabledFlag) {
      throw new Error(
        'NonInteractiveLoginConfig: refusing to start — NODE_ENV=production with non_interactive_login.enabled=true. This feature MUST NOT be enabled in production.'
      );
    }
    if (nodeEnv === 'production' && keyPresent) {
      throw new Error(
        'NonInteractiveLoginConfig: refusing to start — NODE_ENV=production with non_interactive_login.signing_key set. Remove NON_INTERACTIVE_LOGIN_SIGNING_KEY from the production environment.'
      );
    }
    if (enabledFlag && !keyPresent) {
      throw new Error(
        'NonInteractiveLoginConfig: enabled=true requires non_interactive_login.signing_key (32+ random bytes, hex- or base64-encoded; env: NON_INTERACTIVE_LOGIN_SIGNING_KEY).'
      );
    }
    if (enabledFlag && keyPresent) {
      const decoded = NonInteractiveLoginConfig.decodeKey(keyRaw);
      if (decoded === null || decoded.length < 32) {
        throw new Error(
          "NonInteractiveLoginConfig: non_interactive_login.signing_key must decode to at least 32 bytes. Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
        );
      }
    }

    if (this.enabled) {
      this.logger.warn?.(
        '[NON-INTERACTIVE LOGIN] enabled — POST /api/auth/non-interactive-login is mounted and the non-interactive-login bearer strategy is active. NEVER run with this in production.',
        NonInteractiveLoginConfig.name
      );
    }
  }

  // Accepts hex (64 chars for 32 bytes) or base64. Returns null on parse error.
  private static decodeKey(raw: string): Uint8Array | null {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length % 2 === 0) {
      return new Uint8Array(Buffer.from(trimmed, 'hex'));
    }
    try {
      const buf = Buffer.from(trimmed, 'base64');
      if (buf.length > 0) return new Uint8Array(buf);
    } catch {
      /* ignore */
    }
    return null;
  }
}
