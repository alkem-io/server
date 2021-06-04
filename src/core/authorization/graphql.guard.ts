import {
  Injectable,
  ExecutionContext,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthorizationRoleGlobal, LogContext } from '@common/enums';
import {
  AuthenticationException,
  ForbiddenException,
} from '@common/exceptions';
import {
  IAuthorizationRule,
  AuthorizationRuleGlobalRole,
} from '@src/core/authorization/rules';
import { AuthorizationRuleSelfRegistration } from '@core/authorization';
import { AuthorizationRuleEngine } from './rules/authorization.rule.engine';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { AgentInfo } from '@core/authentication';

@Injectable()
export class GraphqlGuard extends AuthGuard(['azure-ad', 'oathkeeper-jwt']) {
  identifier: number;

  private authorizationRules!: IAuthorizationRule[];

  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private configService: ConfigService,
    private reflector: Reflector,
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

    // ok to go
    this.authorizationRules = [];

    if (fieldName === 'me') {
      this.logAuthorizationToken(req);
    }

    const globalRoles = this.reflector.get<string[]>(
      'authorizationGlobalRoles',
      context.getHandler()
    );
    const selfRegistration = this.reflector.get<boolean>(
      'self-registration',
      context.getHandler()
    );

    if (globalRoles) {
      for (const role of globalRoles) {
        const allowedRoles: string[] = Object.values(AuthorizationRoleGlobal);
        if (allowedRoles.includes(role)) {
          const rule = new AuthorizationRuleGlobalRole(role, 2);
          this.authorizationRules.push(rule);
        } else {
          throw new ForbiddenException(
            `Invalid global role specified: ${role}`,
            LogContext.AUTH
          );
        }
      }
    }

    if (selfRegistration) {
      const args = context.getArgByIndex(1);
      const rule = new AuthorizationRuleSelfRegistration(fieldName, args, 1);
      this.authorizationRules.push(rule);
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
    // There should also be an AgentInfo
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

    // If no rules then allow the request to proceed
    if (this.authorizationRules.length == 0) return agentInfo;

    const authorizationRuleEngine = new AuthorizationRuleEngine(
      this.authorizationRules
    );

    if (authorizationRuleEngine.run(agentInfo)) {
      this.authorizationEngine.logAgentInfo(
        `[${this.identifier}] - Request handled, returning: ${agentInfo}`,
        agentInfo
      );
      return agentInfo;
    }

    throw new ForbiddenException(
      `[${this.identifier}] - User '${agentInfo.email}' is not authorised to access requested resources.`,
      LogContext.AUTH
    );
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
