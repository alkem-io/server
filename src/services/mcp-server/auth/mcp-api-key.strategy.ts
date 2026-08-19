import { LogContext } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { IncomingMessage } from 'http';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Strategy } from 'passport-custom';
import { McpApiKeyScope } from '../dto/mcp.types';
import { McpApiKeyService } from './mcp-api-key.service';

export const AUTH_STRATEGY_MCP_API_KEY = 'mcp-api-key';

@Injectable()
export class McpApiKeyStrategy extends PassportStrategy(
  Strategy,
  AUTH_STRATEGY_MCP_API_KEY
) {
  constructor(
    private readonly configService: ConfigService<AlkemioConfig, true>,
    private readonly mcpApiKeyService: McpApiKeyService,
    private readonly actorContextService: ActorContextService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    super();
  }

  async validate(request: IncomingMessage): Promise<ActorContext> {
    const mcpEnabled = this.configService.get('mcp.enabled', { infer: true });
    const apiKeyEnabled = this.configService.get('mcp.api_key_enabled', {
      infer: true,
    });

    if (!mcpEnabled || !apiKeyEnabled) {
      this.logger.verbose?.(
        'MCP API key authentication is disabled',
        LogContext.MCP_SERVER
      );
      return this.actorContextService.createAnonymous();
    }

    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      this.logger.verbose?.('No MCP API key provided', LogContext.MCP_SERVER);
      return this.actorContextService.createAnonymous();
    }

    const validatedKey = await this.mcpApiKeyService.validateApiKey(apiKey);

    if (!validatedKey) {
      this.logger.verbose?.('Invalid MCP API key', LogContext.MCP_SERVER);
      return this.actorContextService.createAnonymous();
    }

    // Update last used timestamp asynchronously
    const clientIp = this.extractClientIp(request);
    this.mcpApiKeyService
      .updateLastUsed(validatedKey.id, clientIp)
      .catch(err => {
        this.logger.error?.(
          'Failed to update MCP API key last used timestamp',
          err instanceof Error ? err.stack : undefined,
          LogContext.MCP_SERVER
        );
      });

    // Build the ActorContext for the identity this key authenticates as.
    // T027 (004-web-ai-assistant) generalizes the seam off the hardcoded User
    // UUID: an ACTOR-bound key (the `virtual-assistant` actor, Flow B /
    // system-invoked) builds via `buildForActor` and stamps attribution with a
    // null on-behalf-of user; a user-bound key keeps the existing `buildForUser`
    // path. Exactly one of actorId / userId is set.
    let actorContext: ActorContext;
    if (validatedKey.actorId) {
      actorContext = await this.actorContextService.buildForActor(
        validatedKey.actorId
      );
      if (!actorContext.isAnonymous && actorContext.actorID) {
        // SYSTEM-INVOKED attribution (FR-019): assistantActorId == the actor,
        // onBehalfOfUserId == null (no user). The gate uses the actor's admin
        // capabilityGrant for this context.
        actorContext.delegationContext = {
          assistantActorId: actorContext.actorID,
          onBehalfOfUserId: null,
        };
      }
    } else if (validatedKey.userId) {
      actorContext = await this.actorContextService.buildForUser(
        validatedKey.userId
      );
    } else {
      this.logger.warn?.(
        `MCP API key ${validatedKey.id} has neither actorId nor userId`,
        '',
        LogContext.MCP_SERVER
      );
      return this.actorContextService.createAnonymous();
    }
    // Expose the key's scopes on the request so the controller can forward them
    // to the MCP service for per-operation enforcement. Only the MCP API-key
    // strategy sets this; JWT / Ory / anonymous callers leave it undefined.
    (
      request as IncomingMessage & { mcpApiKeyScopes?: McpApiKeyScope[] }
    ).mcpApiKeyScopes = validatedKey.scopes;
    this.logger.verbose?.(
      `MCP API key authenticated: actorID=${actorContext.actorID}${validatedKey.actorId ? ' (actor-bound, system-invoked)' : ''}`,
      LogContext.MCP_SERVER
    );
    return actorContext;
  }

  /**
   * Extract the MCP API key from request headers ONLY.
   *
   * Query-parameter extraction is deliberately NOT supported: long-lived
   * secrets in the URL leak through access logs, proxy telemetry, caches and
   * browser history, so the key is accepted from the `X-MCP-API-Key` header or
   * an `Authorization: Bearer mcp_…` header only.
   */
  private extractApiKey(request: IncomingMessage): string | undefined {
    // Check X-MCP-API-Key header
    const headerKey = request.headers['x-mcp-api-key'];
    if (headerKey && typeof headerKey === 'string') {
      return headerKey;
    }

    // Check Authorization header with Bearer prefix
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer mcp_')) {
      return authHeader.slice(7); // Remove 'Bearer ' prefix
    }

    return undefined;
  }

  /**
   * Extract client IP from request
   */
  private extractClientIp(request: IncomingMessage): string | undefined {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = typeof forwarded === 'string' ? forwarded : forwarded[0];
      return ips?.split(',')[0]?.trim();
    }
    return request.socket?.remoteAddress;
  }
}
