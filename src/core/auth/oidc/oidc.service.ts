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

    this.issuer = await Issuer.discover(issuer_url);
    this.client = new this.issuer.Client({
      client_id: web_client_id,
      redirect_uris: [web_redirect_uri],
      token_endpoint_auth_method: 'none',
      response_types: ['code'],
    });
    const log: LoggerService = this.logger ?? new Logger(OidcService.name);
    log.log?.(`OIDC Issuer discovered at ${issuer_url}`, OidcService.name);
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
}
