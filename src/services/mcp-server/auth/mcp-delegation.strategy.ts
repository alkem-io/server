import { LogContext } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { VirtualAssistantService } from '@domain/community/virtual-assistant/virtual.assistant.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { KratosPayload } from '@services/infrastructure/kratos/types/kratos.payload';
import { AlkemioConfig } from '@src/types';
import { passportJwtSecret } from 'jwks-rsa';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { McpApiKeyService } from './mcp-api-key.service';

export const AUTH_STRATEGY_MCP_DELEGATION = 'mcp-delegation';

/**
 * The header carrying the on-behalf-of user's JWT for a DELEGATED MCP call.
 * DECIDED v1 (contracts/auth-identity-flow.md): the assistant ACTOR credential
 * (`mcp_api_key`) is the `Authorization`; the on-behalf-of user JWT rides here.
 */
export const X_ALKEMIO_ON_BEHALF_OF_HEADER = 'x-alkemio-on-behalf-of';

/**
 * MCP delegation auth path (Flow A — user-initiated, 004-web-ai-assistant).
 *
 * assistant-service authenticates to the MCP host with its OWN `virtual-assistant`
 * actor credential (the `mcp_api_key` in `Authorization`) AND carries the
 * on-behalf-of user's JWT in the `X-Alkemio-On-Behalf-Of` header. This strategy
 * validates BOTH and builds a DELEGATED ActorContext:
 *
 *   - the JWT (this header) is verified via the SAME JWKS as the ordinary
 *     `oathkeeper-jwt` path → `alkemio_actor_id` → the USER's ActorContext, so
 *     entity authorization is byte-identical to GraphQL (effective ⊆ user
 *     privileges, FR-002), and
 *   - the `mcp_api_key` identifies the acting assistant; the resulting context
 *     is stamped with `delegationContext = { assistantActorId, onBehalfOfUserId }`
 *     for ATTRIBUTION only (never authorization, FR-016/SC-010).
 *
 * passport-jwt verifies the header JWT and calls validate() with its payload;
 * we then additionally validate the Authorization mcp_api_key. If the api_key
 * is missing/invalid, or MCP/api-key auth is disabled, we return null so the
 * guard moves on (no delegation, falls through to other strategies / anonymous).
 */
@Injectable()
export class McpDelegationStrategy extends PassportStrategy(
  Strategy,
  AUTH_STRATEGY_MCP_DELEGATION
) {
  constructor(
    private readonly configService: ConfigService<AlkemioConfig, true>,
    private readonly authenticationService: AuthenticationService,
    private readonly mcpApiKeyService: McpApiKeyService,
    private readonly virtualAssistantService: VirtualAssistantService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: configService.get(
          'identity.authentication.providers.ory.jwks_uri',
          { infer: true }
        ),
      }),
      issuer: configService.get(
        'identity.authentication.providers.ory.issuer',
        { infer: true }
      ),
      // Extract the on-behalf-of user JWT from the dedicated header (NOT
      // Authorization, which carries the assistant actor's mcp_api_key).
      jwtFromRequest: ExtractJwt.fromHeader(X_ALKEMIO_ON_BEHALF_OF_HEADER),
      // Mirror OryStrategy: ignore exp at parse time, enforce in validate().
      ignoreExpiration: true,
      passReqToCallback: true,
    });
  }

  async validate(
    req: { headers?: Record<string, string | string[] | undefined> },
    payload: KratosPayload
  ): Promise<ActorContext | null> {
    const mcpEnabled = this.configService.get('mcp.enabled', { infer: true });
    const apiKeyEnabled = this.configService.get('mcp.api_key_enabled', {
      infer: true,
    });
    if (!mcpEnabled || !apiKeyEnabled) {
      return null;
    }

    // 1. Validate the assistant actor credential (Authorization: Bearer mcp_…).
    const apiKey = this.extractApiKey(req.headers?.authorization);
    if (!apiKey) {
      // No actor credential ⇒ not a delegation call; let other strategies run.
      return null;
    }
    const validatedKey = await this.mcpApiKeyService.validateApiKey(apiKey);
    if (!validatedKey) {
      this.logger.verbose?.(
        'MCP delegation: invalid assistant actor credential',
        LogContext.MCP_SERVER
      );
      return null;
    }

    // 2. Validate the on-behalf-of user JWT (already verified by passport-jwt).
    if (!payload.alkemio_actor_id) {
      this.logger.verbose?.(
        'MCP delegation: on-behalf-of JWT missing alkemio_actor_id',
        LogContext.MCP_SERVER
      );
      return null;
    }
    if (payload.session?.expires_at && hasExpired(payload.session.expires_at)) {
      this.logger.verbose?.(
        'MCP delegation: on-behalf-of session expired',
        LogContext.MCP_SERVER
      );
      return null;
    }

    // 3. Build the USER's ActorContext — authorization flows entirely through
    //    the user's credentials (effective ⊆ user privileges by construction).
    const userContext = await this.authenticationService.createActorContext(
      payload.alkemio_actor_id,
      payload.session ?? undefined
    );
    if (userContext.isAnonymous || !userContext.actorID) {
      this.logger.verbose?.(
        'MCP delegation: on-behalf-of user resolved to anonymous',
        LogContext.MCP_SERVER
      );
      return null;
    }

    // 4. Resolve the acting assistant actor for ATTRIBUTION (the singleton
    //    virtual-assistant). T027 (S2) makes the mcp_api_key itself actor-bound;
    //    until then we resolve the singleton — there is exactly one.
    const assistantActor =
      await this.virtualAssistantService.getSingletonOrFail();

    userContext.delegationContext = {
      assistantActorId: assistantActor.id,
      onBehalfOfUserId: userContext.actorID,
    };

    this.logger.verbose?.(
      `MCP delegation authenticated: assistant=${assistantActor.id} onBehalfOf=${userContext.actorID}`,
      LogContext.MCP_SERVER
    );
    return userContext;
  }

  /** Extract an `mcp_…` key from an `Authorization: Bearer mcp_…` header. */
  private extractApiKey(
    authHeader: string | string[] | undefined
  ): string | undefined {
    const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    if (header && header.startsWith('Bearer mcp_')) {
      return header.slice(7);
    }
    return undefined;
  }
}

const hasExpired = (expiresAt: string): boolean => {
  const ts = Date.parse(expiresAt);
  return Number.isFinite(ts) && Date.now() >= ts;
};
