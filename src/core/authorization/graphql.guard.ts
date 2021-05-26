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

@Injectable()
export class GraphqlGuard extends AuthGuard([
  'azure-ad',
  'demo-auth-jwt',
  'oathkeeper-jwt',
]) {
  JWT_EXPIRED = 'jwt is expired';

  private authorizationRules!: IAuthorizationRule[];
  private fieldName!: string;

  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();
    this.authorizationRules = [];

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
      const fieldName = context.getArgByIndex(3).fieldName;
      const rule = new AuthorizationRuleSelfRegistration(fieldName, args, 1);
      this.authorizationRules.push(rule);
    }

    return super.canActivate(new ExecutionContextHost([req]));
  }

  handleRequest(
    err: any,
    userInfo: any,
    info: any,
    _context: any,
    _status?: any
  ) {
    // Always handle the request if authentication is disabled
    const authEnabled = this.configService.get(ConfigurationTypes.Identity)
      ?.authentication?.enabled;
    if (!authEnabled) {
      return userInfo;
    }

    if (info && info[0] === this.JWT_EXPIRED)
      throw new TokenException(
        'Access token has expired!',
        CherrytwistErrorStatus.TOKEN_EXPIRED
      );

    if (err) throw new AuthenticationException(err);

    if (!userInfo) {
      const msg = this.buildErrorMessage(err, info);
      throw new AuthenticationException(msg);
    }

    // If no rules then allow the request to proceed
    if (this.authorizationRules.length == 0) return userInfo;

    const authorizationRuleEngine = new AuthorizationRuleEngine(
      this.authorizationRules
    );

    if (authorizationRuleEngine.run(userInfo)) return userInfo;

    throw new ForbiddenException(
      `User '${userInfo.email}' is not authorised to access requested resources.`,
      LogContext.AUTH
    );
  }

  private buildErrorMessage(err: any, info: any): string {
    if (err) return err;
    if (info) {
      const msg = info[0] as string;
      if (msg && msg.toLowerCase().includes('error')) return msg;
    }

    return 'Failed to retrieve authenticated account information from the graphql context! ';
  }
}
