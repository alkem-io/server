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
import {
  AuthorizationRoleGlobal,
  ConfigurationTypes,
  LogContext,
  CherrytwistErrorStatus,
  AuthorizationPrivilege,
} from '@common/enums';
import {
  AuthenticationException,
  TokenException,
  ForbiddenException,
} from '@common/exceptions';
import {
  IAuthorizationRule,
  AuthorizationRuleGlobalRole,
} from '@src/core/authorization/rules';
import { AuthorizationRuleSelfRegistration } from '@core/authorization';
import { AuthorizationRuleEngine } from './rules/authorization.rule.engine';
import { AuthorizationRuleCredentialPrivilege } from './rules/authorization.rule.credential.privilege';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { AgentInfo } from '@core/authentication';

@Injectable()
export class GraphqlGuard extends AuthGuard(['azure-ad', 'oathkeeper-jwt']) {
  JWT_EXPIRED = 'jwt is expired';
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
    const privilege = this.reflector.get<AuthorizationPrivilege>(
      'privilege',
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

    if (privilege) {
      const fieldName = graphqlInfo.fieldName;
      const fieldParent = ctx.getRoot();
      const rule = new AuthorizationRuleCredentialPrivilege(
        this.authorizationEngine,
        privilege,
        fieldParent,
        fieldName
      );
      this.authorizationRules.push(rule);
    }

    const identifier2 = Math.floor(Math.random() * 10000);

    this.logger.verbose?.(
      `[${this.identifier} - ${identifier2}] - canActivate pending...`,
      LogContext.AUTH
    );
    const result = await super.canActivate(new ExecutionContextHost([req]));
    this.logger.verbose?.(
      `[${this.identifier} - ${identifier2}] -
      canActivate completed: ${result} - ${result.valueOf()}`,
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
    // Always handle the request if authentication is disabled
    const authEnabled = this.configService.get(ConfigurationTypes.Identity)
      ?.authentication?.enabled;
    if (!authEnabled) {
      if (!agentInfo) return new AgentInfo();
      return agentInfo;
    }

    // Ensure there is always a valid agentInfo
    let actingAgent: AgentInfo;
    if (!agentInfo) {
      this.logger.verbose?.(
        `[${this.identifier}] - AgentInfo NOT present: ${agentInfo}`,
        LogContext.AUTH
      );
      actingAgent = new AgentInfo();
    } else {
      this.authorizationEngine.logAgentInfo(
        `[${this.identifier}] - AgentInfo present: ${agentInfo}`,
        agentInfo
      );
      actingAgent = agentInfo;
    }

    if (info && info[0] === this.JWT_EXPIRED)
      throw new TokenException(
        'Access token has expired!',
        CherrytwistErrorStatus.TOKEN_EXPIRED
      );

    if (err) throw new AuthenticationException(err);

    // if (!agentInfo) {
    //   const msg = this.buildErrorMessage(err, info);
    //   throw new AuthenticationException(msg);
    // }

    // If no rules then allow the request to proceed
    if (this.authorizationRules.length == 0) return agentInfo;

    const authorizationRuleEngine = new AuthorizationRuleEngine(
      this.authorizationRules
    );

    if (authorizationRuleEngine.run(actingAgent)) {
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

  private buildErrorMessage(err: any, info: any): string {
    if (err) return err;
    if (info) {
      const msg = info[0] as string;
      if (msg && msg.toLowerCase().includes('error')) return msg;
    }

    return `[${this.identifier}] - Failed to retrieve authenticated account information from the graphql context! `;
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
