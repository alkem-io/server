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

    // Create actor context for the user associated with this API key
    const actorContext = await this.actorContextService.buildForUser(
      validatedKey.userId
    );
    // Expose the key's scopes on the request so the controller can forward them
    // to the MCP service for per-operation enforcement. Only the MCP API-key
    // strategy sets this; JWT / Ory / anonymous callers leave it undefined.
    (
      request as IncomingMessage & { mcpApiKeyScopes?: McpApiKeyScope[] }
    ).mcpApiKeyScopes = validatedKey.scopes;
    this.logger.verbose?.(
      `MCP API key authenticated: userId=${actorContext.actorID}`,
      LogContext.MCP_SERVER
    );
    return actorContext;
  }

  /**
   * Extract API key from request headers or query parameters
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

    // Check query parameter
    const url = request.url;
    if (url) {
      try {
        const urlObj = new URL(url, 'http://localhost');
        const queryKey = urlObj.searchParams.get('apiKey');
        if (queryKey && queryKey.startsWith('mcp_')) {
          return queryKey;
        }
      } catch {
        // URL parsing failed, ignore
      }
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
