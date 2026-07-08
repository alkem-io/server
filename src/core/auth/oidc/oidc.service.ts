import type { LoggerService } from '@nestjs/common';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Client, Issuer } from 'openid-client';

// openid-client RP wiring. Issuer discovery happens once at module init
// against `identity.authentication.providers.oidc.issuer_url`; the resolved
// Client is exposed via getClient() for the controller (login/callback/refresh).
//
// - public client: token_endpoint_auth_method=none
// - PKCE-S256 mandatory (controller sets code_challenge_method=S256)
// - nonce always present (controller sets nonce)

// Discovery retry policy. `Issuer.discover` does a single HTTP GET with
// openid-client's default 3500 ms timeout; a bare `await` there crash-loops the
// whole process whenever the identity chain (Hydra + traefik) is slow to settle
// after a restart wave — e.g. right after a test-env DB reset scales Hydra back
// up (test-suites#555). Retry with capped exponential backoff so a transient
// unavailability delays boot instead of killing it; only a persistently
// unreachable issuer (all attempts exhausted) is fatal.
const DISCOVERY_MAX_ATTEMPTS = 10;
const DISCOVERY_BASE_DELAY_MS = 1000;
const DISCOVERY_MAX_DELAY_MS = 15000;

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

@Injectable()
export class OidcService implements OnModuleInit {
  private issuer?: Issuer<Client>;
  private client?: Client;
  private preAuthKeyCached?: Uint8Array;
  private cookieSecureCached?: boolean;

  constructor(
    private readonly configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async onModuleInit(): Promise<void> {
    const { issuer_url, web_client_id, web_redirect_uri } =
      this.configService.get('identity.authentication.providers.oidc', {
        infer: true,
      });

    this.issuer = await this.discoverWithRetry(issuer_url);
    this.client = new this.issuer.Client({
      client_id: web_client_id,
      redirect_uris: [web_redirect_uri],
      token_endpoint_auth_method: 'none',
      response_types: ['code'],
    });
    const log: LoggerService = this.logger ?? new Logger(OidcService.name);
    log.log?.(`OIDC Issuer discovered at ${issuer_url}`, OidcService.name);
  }

  private async discoverWithRetry(issuerUrl: string): Promise<Issuer<Client>> {
    const log: LoggerService = this.logger ?? new Logger(OidcService.name);
    for (let attempt = 1; attempt <= DISCOVERY_MAX_ATTEMPTS; attempt++) {
      try {
        return await Issuer.discover(issuerUrl);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (attempt === DISCOVERY_MAX_ATTEMPTS) {
          log.error?.(
            `OIDC issuer discovery failed after ${attempt} attempts against ${issuerUrl}: ${message}`,
            error instanceof Error ? error.stack : undefined,
            OidcService.name
          );
          throw error;
        }
        const delay = Math.min(
          DISCOVERY_BASE_DELAY_MS * 2 ** (attempt - 1),
          DISCOVERY_MAX_DELAY_MS
        );
        log.warn?.(
          `OIDC issuer discovery attempt ${attempt}/${DISCOVERY_MAX_ATTEMPTS} against ${issuerUrl} failed (${message}); retrying in ${delay}ms`,
          OidcService.name
        );
        await sleep(delay);
      }
    }
    // Unreachable: the loop either returns or throws on the final attempt.
    throw new Error('OIDC issuer discovery exhausted all attempts');
  }

  getIssuer(): Issuer<Client> {
    if (!this.issuer) {
      throw new Error(
        'OIDC issuer not initialised — onModuleInit did not complete'
      );
    }
    return this.issuer;
  }

  getClient(): Client {
    if (!this.client) {
      throw new Error(
        'OIDC client not initialised — onModuleInit did not complete'
      );
    }
    return this.client;
  }

  getPreAuthSigningKey(): Uint8Array {
    if (!this.preAuthKeyCached) {
      const { pre_auth_cookie_signing_key } = this.configService.get(
        'identity.authentication.providers.oidc',
        { infer: true }
      );
      this.preAuthKeyCached = new TextEncoder().encode(
        pre_auth_cookie_signing_key
      );
    }
    return this.preAuthKeyCached;
  }

  getCookieSecure(): boolean {
    if (this.cookieSecureCached === undefined) {
      const { cookie } = this.configService.get(
        'identity.authentication.providers.oidc',
        { infer: true }
      );
      this.cookieSecureCached = !!cookie?.secure;
    }
    return this.cookieSecureCached;
  }

  // Default landing for /api/auth/oidc/logout when the caller (typically a
  // direct browser visit) didn't supply post_logout_redirect_uri. Derived from
  // the configured web_redirect_uri so it tracks the SPA origin per env.
  getDefaultPostLogoutRedirectUri(): string {
    const { web_redirect_uri } = this.configService.get(
      'identity.authentication.providers.oidc',
      { infer: true }
    );
    try {
      return `${new URL(web_redirect_uri).origin}/logout`;
    } catch {
      return '/logout';
    }
  }
}
