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
import { IServiceConfig } from '@interfaces/service.config.interface';
import { Reflector } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@utils/logging/logging.contexts';
import { AuthenticationException } from '@utils/error-handling/exceptions/authentication.exception';
import { TokenException } from '@utils/error-handling/exceptions/token.exception';
import { ForbiddenException } from '@utils/error-handling/exceptions/forbidden.exception';
import { CherrytwistErrorStatus } from '@utils/error-handling/enums/cherrytwist.error.status';
import { UserInfo } from '@utils/authentication/user-info';
import { AuthorizationRoles } from './authorization.roles';

@Injectable()
export class GqlAuthGuard extends AuthGuard(['azure-ad', 'simple-auth-jwt']) {
  JWT_EXPIRED = 'jwt is expired';

  private _roles!: string[];
  public get roles(): string[] {
    return this._roles || [];
  }
  public set roles(value: string[]) {
    this._roles = value;
  }

  private _selfManagement!: boolean;
  public get selfManagement(): boolean {
    return this._selfManagement || false;
  }
  public set selfManagement(v: boolean) {
    this._selfManagement = v;
  }

  private _email!: string;
  public get email(): string {
    return this._email;
  }
  public set email(v: string) {
    this._email = v;
  }

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

    this.selfManagement = this.reflector.get<boolean>(
      'self-management',
      context.getHandler()
    );
    if (this.selfManagement) {
      const userData = ctx.getArgs().userData;
      this.email = userData.email;
    }

    // if (userData) email = userData.email;
    const auth_roles = this.reflector.get<string[]>(
      'roles',
      context.getHandler()
    );
    this.roles = auth_roles;

    return super.canActivate(new ExecutionContextHost([req]));
  }

  matchRoles(userInfo: UserInfo): boolean {
    if (this.roles.length == 0) return true;
    const groups = userInfo.user?.userGroups;

    if (!groups) return false;

    return groups.some(
      ({ name }) =>
        name === AuthorizationRoles.GlobalAdmins || this.roles.includes(name)
    );
  }

  handleRequest(err: any, user: any, info: any, _context: any, _status?: any) {
    // Always handle the request if authentication is disabled
    if (
      this.configService.get<IServiceConfig>('service')
        ?.authenticationEnabled === 'false'
    ) {
      return user;
    }

    if (info === this.JWT_EXPIRED)
      throw new TokenException(
        'Access token has expired!',
        CherrytwistErrorStatus.TOKEN_EXPIRED
      );

    if (err) throw new AuthenticationException(err);

    if (this.selfManagement && this.email === user.email) {
      return user;
    }

    if (!user)
      throw new AuthenticationException(
        'Failed to retrieve authenticated account information from the graphql context! '
      );

    if (this.matchRoles(user)) return user;
    throw new ForbiddenException(
      `User '${user.email}' is not authorised to access requested resources.`,
      LogContext.AUTH
    );
  }
}
