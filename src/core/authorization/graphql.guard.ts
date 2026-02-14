import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { AuthenticationException } from '@common/exceptions';
import {
  AUTH_STRATEGY_OATHKEEPER_API_TOKEN,
  AUTH_STRATEGY_OATHKEEPER_JWT,
} from '@core/authentication';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import {
  ContextType,
  ExecutionContext,
  Inject,
  Injectable,
  LoggerService,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq } from 'drizzle-orm';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { AuthorizationRuleAgentPrivilege } from './authorization.rule.agent.privilege';

@Injectable()
export class GraphqlGuard extends AuthGuard([
  AUTH_STRATEGY_OATHKEEPER_JWT,
  AUTH_STRATEGY_OATHKEEPER_API_TOKEN,
]) {
  instanceId: string;

  constructor(
    private reflector: Reflector,
    private authorizationService: AuthorizationService,
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    super();
    // Note: instanceID can be useful for debugging purposes, but by default not enabled.
    this.instanceId = '';
    //this.instanceId = Math.floor(Math.random() * 10000).toString();
  }

  // Need to override base method for graphql requests
  getRequest(context: ExecutionContext) {
    if (context.getType<ContextType | 'graphql'>() === 'graphql') {
      const ctx = GqlExecutionContext.create(context).getContext();

      // required for passport.js for websocket grapqhl subscriptions
      if (ctx.websocketHeader?.connectionParams) {
        const websocketHeader = ctx.websocketHeader?.connectionParams || {};

        return { headers: { ...websocketHeader } };
      }

      return ctx.req;
    }
    return context.switchToHttp().getRequest();
  }

  /**
   if *canActive* is defined the authorization WILL NOT GO through the defined strategies, and use the code here instead.
   if **handleRequest* is defined WILL USE the defined strategies

   *handleRequest* is used to extend the error handling or how the request is handled
 */
  handleRequest(
    err: any,
    agentInfo: any,
    info: any,
    _context: any,
    _status?: any
  ) {
    if (err) {
      throw new AuthenticationException(
        err?.message ?? String(err),
        LogContext.AUTH
      );
    }

    const gqlContext = GqlExecutionContext.create(_context);
    const graphqlInfo = gqlContext.getInfo();
    const fieldName = graphqlInfo.fieldName;

    // Ensure there is always an AgentInfo
    let resultAgentInfo = agentInfo;

    if (agentInfo) {
      this.authorizationService.logAgentInfo(agentInfo);
    } else {
      this.logger.warn?.(
        `[${this.instanceId}] - AgentInfo NOT present or false: ${agentInfo}`,
        LogContext.AUTH
      );
      // Create anonymous agent info as fallback
      resultAgentInfo = this.createAnonymousAgentInfo();
    }

    // Apply any rules
    const privilege = this.reflector.get<AuthorizationPrivilege>(
      'privilege',
      _context.getHandler()
    );
    if (privilege) {
      const fieldParent = gqlContext.getRoot();
      if (fieldParent.authorizationId && !fieldParent.authorization) {
        this.logger.error(
          {
            message: 'No authorization policy present in Guard',
            fieldName,
            fieldParent,
            authorizationId: fieldParent.authorizationId,
          },
          undefined,
          LogContext.CODE_ERRORS
        );
        this.db.query.authorizationPolicies
          .findFirst({
            where: eq(authorizationPolicies.id, fieldParent.authorizationId),
          })
          .then((authorization: any) => {
            fieldParent.authorization = authorization as unknown as AuthorizationPolicy;
          })
          .catch((error: any) => {
            this.logger.error(
              `Error loading authorization with id ${fieldParent.authorizationId}: ${error}`,
              undefined,
              LogContext.AUTH_GUARD
            );
          })
          .finally(() => {
            this.executeAuthorizationRule(
              privilege,
              fieldParent,
              fieldName,
              resultAgentInfo
            );
          });
      } else {
        this.executeAuthorizationRule(
          privilege,
          fieldParent,
          fieldName,
          resultAgentInfo
        );
      }
    }

    return resultAgentInfo;
  }

  private executeAuthorizationRule(
    privilege: AuthorizationPrivilege,
    fieldParent: any,
    fieldName: any,
    resultAgentInfo: any
  ) {
    const rule = new AuthorizationRuleAgentPrivilege(
      this.authorizationService,
      privilege,
      fieldParent,
      fieldName
    );
    rule.execute(resultAgentInfo);
  }

  public createAnonymousAgentInfo(): AgentInfo {
    const agentInfo = new AgentInfo();
    const anonymousCredential: ICredentialDefinition = {
      type: AuthorizationCredential.GLOBAL_ANONYMOUS,
      resourceID: '',
    };
    agentInfo.credentials = [anonymousCredential];
    return agentInfo;
  }
}
