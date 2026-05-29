import { LogContext } from '@common/enums/logging.context';
import { ActorContext } from '@core/actor-context/actor.context';
import {
  AUTH_STRATEGY_OATHKEEPER_API_TOKEN,
  AUTH_STRATEGY_OATHKEEPER_JWT,
} from '@core/authentication';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  LoggerService,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AUTH_STRATEGY_MCP_API_KEY } from './mcp-api-key.strategy';

/**
 * Individual strategy guards for sequential authentication
 */
@Injectable()
class McpApiKeyGuard extends AuthGuard(AUTH_STRATEGY_MCP_API_KEY) {}

@Injectable()
class OathkeeperJwtGuard extends AuthGuard(AUTH_STRATEGY_OATHKEEPER_JWT) {}

@Injectable()
class OathkeeperApiTokenGuard extends AuthGuard(
  AUTH_STRATEGY_OATHKEEPER_API_TOKEN
) {}

/**
 * Guard for MCP server endpoints.
 * Tries authentication strategies in order:
 * 1. MCP API keys (dedicated MCP auth)
 * 2. Ory JWT tokens (existing auth)
 * 3. Ory API tokens (existing auth)
 *
 * Stops at the first strategy that returns an authenticated (non-anonymous) user.
 * Falls back to anonymous if no strategy authenticates successfully.
 */
@Injectable()
export class McpAuthGuard implements CanActivate {
  private readonly mcpApiKeyGuard = new McpApiKeyGuard();
  private readonly oathkeeperJwtGuard = new OathkeeperJwtGuard();
  private readonly oathkeeperApiTokenGuard = new OathkeeperApiTokenGuard();

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const strategies = [
      { name: 'mcp-api-key', guard: this.mcpApiKeyGuard },
      { name: 'oathkeeper-jwt', guard: this.oathkeeperJwtGuard },
      { name: 'oathkeeper-api-token', guard: this.oathkeeperApiTokenGuard },
    ];

    for (const { name, guard } of strategies) {
      try {
        // Try to activate this strategy
        const canActivate = await guard.canActivate(context);

        if (canActivate) {
          // Get the user set by this strategy
          const user = request.user as ActorContext | undefined;

          // Check if this is an authenticated (non-anonymous) user
          if (user && user.actorID && !user.isAnonymous) {
            this.logger.verbose?.(
              `MCP auth succeeded with strategy '${name}': userID=${user.actorID}`,
              LogContext.MCP_SERVER
            );
            return true; // Stop here - we have an authenticated user
          }

          this.logger.verbose?.(
            `Strategy '${name}' returned anonymous user, trying next...`,
            LogContext.MCP_SERVER
          );
        }
      } catch (err) {
        // Strategy failed, try next one
        this.logger.verbose?.(
          `Strategy '${name}' failed: ${err instanceof Error ? err.message : 'unknown'}`,
          LogContext.MCP_SERVER
        );
      }
    }

    // No strategy authenticated - allow through with anonymous
    // (individual endpoints can check for authentication if required)
    this.logger.verbose?.(
      'MCP auth: No strategy authenticated, allowing anonymous access',
      LogContext.MCP_SERVER
    );

    // Ensure request.user is set to anonymous if not already set
    if (!request.user) {
      request.user = this.createAnonymousActorContext();
    }

    return true;
  }

  private createAnonymousActorContext(): ActorContext {
    const agentInfo = new ActorContext();
    agentInfo.isAnonymous = true;
    agentInfo.credentials = [];
    return agentInfo;
  }
}
