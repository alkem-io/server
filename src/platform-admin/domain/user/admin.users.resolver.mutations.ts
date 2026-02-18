import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { UserIdentityDeletionException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { IUser } from '@domain/community/user/user.interface';
import { UserService } from '@domain/community/user/user.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@InstrumentResolver()
@Resolver()
export class AdminUsersMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private kratosService: KratosService,
    private userService: UserService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService
  ) {}

  @Mutation(() => IUser, {
    description:
      'Remove the Kratos account associated with the specified User. Note: the Users profile on the platform is not deleted.',
  })
  async adminUserAccountDelete(
    @CurrentActor() actorContext: ActorContext,
    @Args('userID', { type: () => UUID }) userID: string
  ): Promise<IUser> {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      actorContext,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `Remove Kratos account for User ${userID}: ${actorContext.actorId}`
    );

    const user = await this.userService.getUserByIdOrFail(userID);
    try {
      await this.kratosService.deleteIdentityByEmail(user.email);
      const updatedUser =
        await this.userService.clearAuthenticationIDForUser(user);
      this.logger.verbose?.(
        `Account associated with User ${user.email} has been deleted and authentication ID cleared`,
        LogContext.AUTH
      );
      return updatedUser;
    } catch (error: any) {
      this.logger.error?.(
        `Failed to delete account for User ID ${userID}: ${error.message}`,
        LogContext.AUTH
      );
      throw new UserIdentityDeletionException('Failed to delete user account');
    }
  }
}
