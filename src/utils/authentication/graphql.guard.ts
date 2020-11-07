import { Injectable, ExecutionContext, Inject, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { AuthenticationError } from 'apollo-server-core';
import { ConfigService } from '@nestjs/config';
import { IServiceConfig } from '../../interfaces/service.config.interface';
import { Reflector } from '@nestjs/core';
import { IUserGroup } from '../../domain/user-group/user-group.interface';
import { RestrictedGroupNames } from '../../domain/user-group/user-group.entity';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContexts } from '../logging/logging-framework';

@Injectable()
export class GqlAuthGuard extends AuthGuard('azure-ad') {
  private _roles!: string[];
  public get roles(): string[] {
    return this._roles;
  }
  public set roles(value: string[]) {
    this._roles = value;
  }

  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger
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

  matchRoles(userGroups: IUserGroup[]): boolean {
    return userGroups.some(
      ({ name }) =>
        name === RestrictedGroupNames.GlobalAdmins || this.roles.includes(name)
    );
  }

  handleRequest(err: any, user: any, info: any) {
    // Always handle the request if authentication is disabled
    if (
      this.configService.get<IServiceConfig>('service')
        ?.authenticationEnabled === 'false'
    ) {
      return user;
    }

    if (err) throw err;

    if (!user) {
      this.logger.error(info, LogContexts.AUTH);
      throw new AuthenticationError(
        'You are not authorized to access this resource.'
      );
    }

    if (this.matchRoles(user.userGroups)) return user;
    throw new AuthenticationError(
      `User '${user.email}' doesn't have any roles in this ecoverse.`
    );
  }
}
