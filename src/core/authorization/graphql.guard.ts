import {
  Injectable,
  ExecutionContext,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AuthenticationException } from '@common/exceptions';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { AgentInfo } from '@core/authentication';
import { AuthorizationRuleAgentPrivilege } from './authorization.rule.agent.privilege';
@Injectable()
export class GraphqlGuard extends AuthGuard(['azure-ad', 'oathkeeper-jwt']) {
  agentInfo?: AgentInfo;

  constructor(
    private reflector: Reflector,
    private authorizationEngine: AuthorizationEngineService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    super();
  }

  // Need to override base method for graphql requests
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }

  handleRequest(
    err: any,
    agentInfo: any,
    info: any,
    _context: any,
    _status?: any
  ) {
    if (err) throw new AuthenticationException(err);

    const gqlContext = GqlExecutionContext.create(_context);
    const req = gqlContext.getContext().req;
    const graphqlInfo = gqlContext.getInfo();
    const fieldName = graphqlInfo.fieldName;

    // Ensure there is always an AgentInfo
    let resultAgentInfo = agentInfo;
    if (!agentInfo) {
      this.logger.verbose?.('AgentInfo NOT present', LogContext.AUTH);
      if (this.agentInfo) {
        this.logger.verbose?.('...using empty AgentInfo', LogContext.AUTH);
        resultAgentInfo = new AgentInfo();
      } else {
        this.logger.verbose?.('...using an empty AgentInfo', LogContext.AUTH);
        resultAgentInfo = new AgentInfo();
      }
    } else {
      this.authorizationEngine.logAgentInfo(
        `AgentInfo present with info: ${info}`,
        agentInfo
      );
      if (fieldName === 'me' && agentInfo.email.length > 0) {
        this.logAuthorizationToken(req);
      }
      this.agentInfo = agentInfo;
    }

    // Apply any rules
    const privilege = this.reflector.get<AuthorizationPrivilege>(
      'privilege',
      _context.getHandler()
    );
    if (privilege) {
      const fieldParent = gqlContext.getRoot();
      const rule = new AuthorizationRuleAgentPrivilege(
        this.authorizationEngine,
        privilege,
        fieldParent,
        fieldName
      );
      rule.execute(resultAgentInfo);
    }

    return resultAgentInfo;
  }

  logAuthorizationToken(req: any) {
    try {
      let authorizationHeader: string = req.headers.authorization;
      if (authorizationHeader)
        authorizationHeader = authorizationHeader.substring(7);
      this.logger.verbose?.(
        `Authorization header token: ${authorizationHeader}`,
        LogContext.AUTH
      );
    } catch (error) {
      this.logger.error(
        `Unable to retrieve Authorization header token: ${req}`,
        LogContext.AUTH
      );
    }
  }
}
