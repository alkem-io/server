import type { LoggerService } from '@nestjs/common';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Client, Issuer } from 'openid-client';

// openid-client RP wiring. Issuer discovery is kicked off (in the background)
// at module init against `identity.authentication.providers.oidc.issuer_url`;
// the resolved Client is exposed via getClient() for the controller
// (login/callback/refresh), the only consumer of OIDC discovery.
//
// - public client: token_endpoint_auth_method=none
// - PKCE-S256 mandatory (controller sets code_challenge_method=S256)
// - nonce always present (controller sets nonce)

// Discovery retry policy. `Issuer.discover` does a single HTTP GET with
// openid-client's default 3500 ms timeout. Discovery runs in the background and
// is NEVER boot-fatal: onModuleInit returns immediately and initDiscovery()
// retries with capped exponential backoff, then keeps retrying in rounds until
// the issuer is reachable. So a slow/unavailable identity chain (Hydra +
// traefik settling after a restart wave — test-suites#555/#563) delays only
// interactive OIDC login, never the whole server. These constants bound one
// round of attempts.
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

  private discovering = false;

  onModuleInit(): void {
    // Fire-and-forget: OIDC discovery must NEVER be boot-fatal. It is only used
    // by the interactive login controller (oidc.controller.ts) — token
    // validation and non-interactive-login do not touch it — so the server must
    // boot and serve everything else even while the identity chain (Hydra +
    // traefik) is still settling. A boot-fatal discovery previously crashed the
    // process (unhandled rejection, exit 1) whenever discovery outlasted its 10
    // retry attempts, e.g. during a restart wave, and cascaded a whole nightly
    // (test-suites#563).
    void this.initDiscovery();
  }

  // Background, self-healing discovery. Retries rounds indefinitely so the
  // issuer becoming reachable later heals OIDC without a process restart. Never
  // rejects, so it cannot crash the process.
  private async initDiscovery(): Promise<void> {
    if (this.client || this.discovering) {
      return;
    }
    this.discovering = true;
    const log: LoggerService = this.logger ?? new Logger(OidcService.name);
    const { issuer_url, web_client_id, web_redirect_uri } =
      this.configService.get('identity.authentication.providers.oidc', {
        infer: true,
      });
    try {
      for (;;) {
        try {
          this.issuer = await this.discoverWithRetry(issuer_url);
          this.client = new this.issuer.Client({
            client_id: web_client_id,
            redirect_uris: [web_redirect_uri],
            token_endpoint_auth_method: 'none',
            response_types: ['code'],
          });
          log.log?.(
            `OIDC Issuer discovered at ${issuer_url}`,
            OidcService.name
          );
          return;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          log.error?.(
            `OIDC issuer discovery failed against ${issuer_url}; the server is running WITHOUT interactive OIDC login and will keep retrying every ${DISCOVERY_MAX_DELAY_MS}ms. ${message}`,
            error instanceof Error ? error.stack : undefined,
            OidcService.name
          );
          await sleep(DISCOVERY_MAX_DELAY_MS);
        }
      }
    } finally {
      this.discovering = false;
    }
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
        'OIDC issuer not yet initialised — discovery has not completed (the identity provider may be temporarily unavailable); retry shortly'
      );
    }
    return this.issuer;
  }

  getClient(): Client {
    if (!this.client) {
      throw new Error(
        'OIDC client not yet initialised — discovery has not completed (the identity provider may be temporarily unavailable); retry shortly'
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
