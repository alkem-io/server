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
import { RestrictedGroupNames } from '@domain/user-group/user-group.entity';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@utils/logging/logging.contexts';
import { AuthenticationException } from '@utils/error-handling/exceptions/authentication.exception';
import { TokenException } from '@utils/error-handling/exceptions/token.exception';
import { ForbiddenException } from '@utils/error-handling/exceptions/forbidden.exception';
import { CherrytwistErrorStatus } from '@utils/error-handling/enums/cherrytwist.error.status';
import { AuthenticatedUserDTO } from '@utils/auth/authenticated.user.dto';
import { AuthorisationRoles } from './authorisation.service';

@Injectable()
export class GqlAuthGuard extends AuthGuard(['simple-auth-jwt', 'bearer']) {
  JWT_EXPIRED = 'jwt is expired';
  private _roles!: string[];
  public get roles(): string[] {
    return this._roles || [];
  }
  public set roles(value: string[]) {
    this._roles = value;
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

    const auth_roles = this.reflector.get<string[]>(
      'roles',
      context.getHandler()
    );
    this.roles = auth_roles;

    return super.canActivate(new ExecutionContextHost([req]));
  }

  matchRolesAuthUser(authenticatedUser: AuthenticatedUserDTO): boolean {
    if (this.roles.length == 0) return true;
    const ctUser = authenticatedUser.ctUser;
    if (!ctUser) {
      if (this.roles.includes(AuthorisationRoles.NewUser)) {
        return true;
      }
      return false;
    }
    const groups = ctUser.userGroups;
    if (!groups) return false;
    return groups.some(
      ({ name }) =>
        name === RestrictedGroupNames.GlobalAdmins || this.roles.includes(name)
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

    if (!user)
      throw new AuthenticationException(
        'Failed to retrieve authenticated user from the graphql context! '
      );

    if (this.matchRolesAuthUser(user)) return user;
    throw new ForbiddenException(
      `User '${user.email}' is not authorised to access requested resources.`,
      LogContext.AUTH
    );
  }
}
