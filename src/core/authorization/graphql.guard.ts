import {
  Injectable,
  ExecutionContext,
  Inject,
  LoggerService,
  ContextType,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AuthenticationException } from '@common/exceptions';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';
import { AuthorizationRuleAgentPrivilege } from './authorization.rule.agent.privilege';

@Injectable()
export class GraphqlGuard extends AuthGuard([
  'oathkeeper-jwt',
  'oathkeeper-api-token',
]) {
  instanceId: string;

  constructor(
    private reflector: Reflector,
    private authorizationService: AuthorizationService,
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

  handleRequest(
    err: any,
    agentInfo: any,
    info: any,
    _context: any,
    _status?: any
  ) {
    if (err) {
      this.logger.verbose?.(`error: ${err}`, LogContext.AUTH);
      throw new AuthenticationException(err);
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
      resultAgentInfo = new AgentInfo();
    }

    // Apply any rules
    const privilege = this.reflector.get<AuthorizationPrivilege>(
      'privilege',
      _context.getHandler()
    );
    if (privilege) {
      const fieldParent = gqlContext.getRoot();
      const rule = new AuthorizationRuleAgentPrivilege(
        this.authorizationService,
        privilege,
        fieldParent,
        fieldName
      );
      rule.execute(resultAgentInfo);
    }

    return resultAgentInfo;
  }
}
