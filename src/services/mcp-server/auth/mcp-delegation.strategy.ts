import { LogContext } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { ANONYMOUS_ACTOR_ID } from '@core/auth/oidc/constants';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { VirtualAssistantService } from '@domain/community/virtual-assistant/virtual.assistant.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { AlkemioConfig } from '@src/types';
import { IncomingMessage } from 'http';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Strategy } from 'passport-custom';
import { McpApiKeyService } from './mcp-api-key.service';

export const AUTH_STRATEGY_MCP_DELEGATION = 'mcp-delegation';

/**
 * The header carrying the on-behalf-of user's ACTOR ID for a DELEGATED MCP call.
 * DECIDED v2 (contracts/auth-identity-flow.md, OIDC rework): the assistant ACTOR
 * credential (`mcp_api_key`) is the `Authorization`; the on-behalf-of user's
 * actor id (a UUID) rides here.
 */
export const X_ALKEMIO_ON_BEHALF_OF_HEADER = 'x-alkemio-on-behalf-of';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * MCP delegation auth path (Flow A — user-initiated, 004-web-ai-assistant).
 *
 * OIDC rework (2026-06): Oathkeeper and its id_token JWT are retired platform-wide
 * — there is no user JWT to forward anymore. The platform's pattern for trusted
 * downstream services is now identity-by-header: Traefik's `alkemio-resolve`
 * forwardAuth resolves the browser session centrally and injects
 * `X-Alkemio-Actor-Id` (zeroed at the edge so it cannot be spoofed from outside
 * the mesh). assistant-service receives that trusted id and forwards it here.
 *
 * So a delegated call carries:
 *   - `Authorization: Bearer mcp_…` — the assistant's `mcp_api_key`, which MUST
 *     be ACTOR-BOUND to the `virtual-assistant` singleton. This credential is
 *     the TRUST ANCHOR: the on-behalf-of header is honored for it and only it
 *     (a user-bound or unbound key cannot impersonate anyone).
 *   - `X-Alkemio-On-Behalf-Of: <user actor id>` — the user the assistant acts
 *     for, as resolved by the platform edge.
 *
 * The strategy builds the USER's ActorContext from that id (same
 * `createActorContext` as the cookie/bearer paths ⇒ entity authorization is
 * byte-identical to GraphQL; effective ⊆ user privileges, FR-002) and stamps
 * `delegationContext = { assistantActorId, onBehalfOfUserId }` for ATTRIBUTION
 * only (never authorization, FR-016/SC-010). Any precondition failing returns
 * null so the guard falls through (no delegation, never an escalation).
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
    super();
  }

  async validate(request: IncomingMessage): Promise<ActorContext | null> {
    const mcpEnabled = this.configService.get('mcp.enabled', { infer: true });
    const apiKeyEnabled = this.configService.get('mcp.api_key_enabled', {
      infer: true,
    });
    if (!mcpEnabled || !apiKeyEnabled) {
      return null;
    }

    // 1. The on-behalf-of header is what makes this a delegation call.
    const onBehalfOf = this.extractOnBehalfOf(request);
    if (!onBehalfOf) {
      // Not a delegation call; let other strategies run.
      return null;
    }
    if (!UUID_RE.test(onBehalfOf) || onBehalfOf === ANONYMOUS_ACTOR_ID) {
      this.logger.verbose?.(
        'MCP delegation: on-behalf-of header is not a usable actor id',
        LogContext.MCP_SERVER
      );
      return null;
    }

    // 2. Validate the assistant actor credential (Authorization: Bearer mcp_…).
    const apiKey = this.extractApiKey(request.headers?.authorization);
    if (!apiKey) {
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

    // 3. The TRUST ANCHOR: the key must be actor-bound to the virtual-assistant
    //    singleton. A user-bound (or unbound) key must never be able to act on
    //    behalf of arbitrary users.
    const assistantActor =
      await this.virtualAssistantService.getSingletonOrFail();
    if (validatedKey.actorId !== assistantActor.id) {
      this.logger.warn?.(
        'MCP delegation refused: credential is not bound to the virtual-assistant actor',
        LogContext.MCP_SERVER
      );
      return null;
    }

    // 4. Build the USER's ActorContext — authorization flows entirely through
    //    the user's credentials (effective ⊆ user privileges by construction).
    const userContext =
      await this.authenticationService.createActorContext(onBehalfOf);
    if (userContext.isAnonymous || !userContext.actorID) {
      this.logger.verbose?.(
        'MCP delegation: on-behalf-of user resolved to anonymous',
        LogContext.MCP_SERVER
      );
      return null;
    }

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

  private extractOnBehalfOf(request: IncomingMessage): string | undefined {
    const raw = request.headers?.[X_ALKEMIO_ON_BEHALF_OF_HEADER];
    const value = Array.isArray(raw) ? raw[0] : raw;
    return typeof value === 'string' && value.length > 0
      ? value.trim()
      : undefined;
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
