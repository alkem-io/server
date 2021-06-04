import {
  Injectable,
  ExecutionContext,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { AuthenticationException } from '@common/exceptions';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { AgentInfo } from '@core/authentication';

@Injectable()
export class GraphqlGuard extends AuthGuard(['azure-ad', 'oathkeeper-jwt']) {
  identifier: number;

  constructor(
    private authorizationEngine: AuthorizationEngineService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    super();
    this.identifier = Math.floor(Math.random() * 10000);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext().req;
    const graphqlInfo = ctx.getInfo();
    const fieldName = graphqlInfo.fieldName;

    if (fieldName === 'me') {
      this.logAuthorizationToken(req);
    }

    const identifier2 = Math.floor(Math.random() * 10000);

    this.logger.verbose?.(
      `[${this.identifier} - ${identifier2}] - canActivate pending...`,
      LogContext.AUTH
    );
    const result = await super.canActivate(new ExecutionContextHost([req]));
    this.logger.verbose?.(
      `[${
        this.identifier
      } - ${identifier2}] - canActivate completed: ${result} - ${result.valueOf()}`,
      LogContext.AUTH
    );
    return true;
  }

  handleRequest(
    err: any,
    agentInfo: any,
    info: any,
    _context: any,
    _status?: any
  ) {
    if (err) throw new AuthenticationException(err);

    // There should always be an AgentInfo returned, even if it is empty
    if (!agentInfo) {
      this.logger.verbose?.(
        `[${this.identifier}] - AgentInfo NOT present: ${agentInfo}, creating an empty AgentInfo.....`,
        LogContext.AUTH
      );
      return new AgentInfo();
    }

    this.authorizationEngine.logAgentInfo(
      `[${this.identifier}] - AgentInfo present: ${agentInfo}, info: ${info}`,
      agentInfo
    );

    return agentInfo;
  }

  logAuthorizationToken(req: any) {
    try {
      let authorizationHeader: string = req.headers.authorization;
      if (authorizationHeader)
        authorizationHeader = authorizationHeader.substring(7);
      this.logger.verbose?.(
        `[${this.identifier}] - Authorization header token: ${authorizationHeader}`,
        LogContext.AUTH
      );
    } catch (error) {
      this.logger.error(
        `[${this.identifier}] - Unable to retrieve Authorization header token: ${req}`,
        LogContext.AUTH
      );
    }
  }
}
