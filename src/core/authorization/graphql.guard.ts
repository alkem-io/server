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
import { IServiceConfig } from '@src/common/interfaces/service.config.interface';
import { Reflector } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { AuthenticationException } from '@common/exceptions/authentication.exception';
import { TokenException } from '@common/exceptions/token.exception';
import { ForbiddenException } from '@common/exceptions/forbidden.exception';
import { CherrytwistErrorStatus } from '@common/enums/cherrytwist.error.status';
import { UserInfo } from '@src/core/authentication/user-info';
import { AuthorizationRoles } from './authorization.roles';

@Injectable()
export class GqlAuthGuard extends AuthGuard(['azure-ad', 'demo-auth-jwt']) {
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

    if (!user) {
      const msg = this.buildErrorMessage(err, info);
      throw new AuthenticationException(msg);
    }

    if (
      this.selfManagement &&
      this.email.toLowerCase() === user.email.toLowerCase()
    ) {
      return user;
    }

    if (this.matchRoles(user)) return user;
    throw new ForbiddenException(
      `User '${user.email}' is not authorised to access requested resources.`,
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
