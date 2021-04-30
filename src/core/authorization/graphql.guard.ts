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

  private _mutationDTO!: any;
  public get mutationDTO(): any {
    return this._mutationDTO;
  }
  public set mutationDTO(v: any) {
    this._mutationDTO = v;
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
      // Store the incoming DTO
      const args = ctx.getArgs();
      // Mutations: createUser / updateUser
      if (args.userData) this.mutationDTO = args.userData;
      // Mutation: uploadAvatar
      if (args.uploadData) this.mutationDTO = args.uploadData;
      // Mutation: updateProfile
      if (args.profileData) this.mutationDTO = args.profileData;
      // Mutation: createReferenceOnProfile
      if (args.referenceInput) this.mutationDTO = args.referenceInput;
      // Mutation: createTagsetOnProfile
      if (args.tagsetData) this.mutationDTO = args.tagsetData;
      // Mutation: deleteReference
      if (args.deleteData) this.mutationDTO = args.deleteData;

      // Failsafe: if decorator SelfManagement was used then a DTO must have been set
      if (!this.mutationDTO) {
        console.log(`${this.mutationDTO}`);
        throw new ForbiddenException(
          'User self-management not setup properly for requested access.',
          LogContext.AUTH
        );
      }
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

  handleRequest(
    err: any,
    userInfo: any,
    info: any,
    _context: any,
    _status?: any
  ) {
    // Always handle the request if authentication is disabled
    if (
      this.configService.get<IServiceConfig>('service')
        ?.authenticationEnabled === 'false'
    ) {
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

    if (this.selfManagement) {
      // createUser mutation
      if (
        this.mutationDTO.email &&
        this.mutationDTO.email.toLowerCase() === userInfo.email.toLowerCase()
      ) {
        return userInfo;
      }
      // updateUser mutation
      if (this.mutationDTO.ID && this.mutationDTO.ID == userInfo.user.id) {
        return userInfo;
      }
      // uploadAvatar mutation
      if (
        this.mutationDTO.profileID &&
        this.mutationDTO.profileID == userInfo.user.profile.id
      ) {
        return userInfo;
      }
      // updateProfile mutation
      if (
        this.mutationDTO.ID &&
        this.mutationDTO.ID == userInfo.user.profile.id
      ) {
        return userInfo;
      }
      // createReferenceOnProfile mutation
      if (
        this.mutationDTO.parentID &&
        this.mutationDTO.parentID == userInfo.user.profile.id
      ) {
        return userInfo;
      }
      // createTagsetOnProfile mutation
      if (
        this.mutationDTO.parentID &&
        this.mutationDTO.parentID == userInfo.user.profile.id
      ) {
        return userInfo;
      }
      // deleteReference mutation
      if (this.mutationDTO.ID) {
        for (const reference of userInfo.user.profile.references) {
          if (reference.id == this.mutationDTO.ID) return userInfo;
        }
      }
    }

    if (this.matchRoles(userInfo)) return userInfo;
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
