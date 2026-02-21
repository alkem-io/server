import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfoService } from '@core/authentication.agent.info/agent.info.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * Synchronous authorization guard for GraphQL resolvers.
 *
 * Authentication is handled once per request by the global AuthInterceptor
 * which sets `req.user` via passport. This guard reads the already-authenticated
 * agent and checks the required privilege against the parent entity's
 * authorization policy.
 *
 * Keeping this guard synchronous is critical: an async guard (e.g. one that
 * re-runs passport per field) breaks DataLoader batching because each
 * resolver awaits independently, causing loads to dispatch in separate ticks.
 */
@Injectable()
export class GraphqlGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authorizationService: AuthorizationService,
    private agentInfoService: AgentInfoService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Read the privilege set by @AuthorizationAgentPrivilege decorator; skip if none
    const privilege = this.reflector.get<AuthorizationPrivilege>(
      'privilege',
      context.getHandler()
    );
    if (!privilege) {
      return true;
    }

    const gqlContext = GqlExecutionContext.create(context);
    // req.user is set once per request by the global AuthInterceptor (passport)
    const req = gqlContext.getContext<IGraphQLContext>().req;
    // Fall back to anonymous credentials for unauthenticated requests
    const agentInfo =
      req?.user ?? this.agentInfoService.createAnonymousAgentInfo();

    // The parent entity whose authorization policy protects this field
    const fieldParent = gqlContext.getRoot();
    const fieldName = gqlContext.getInfo().fieldName;

    // Check privilege against the parent's authorization policy;
    // throws ForbiddenAuthorizationPolicyException with full diagnostics on failure
    return this.authorizationService.grantAccessOrFail(
      agentInfo,
      fieldParent.authorization,
      privilege,
      `${fieldParent.constructor?.name}.${fieldName}`
    );
  }
}
