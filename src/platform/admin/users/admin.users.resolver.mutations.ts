import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { UserService } from '@domain/community/user/user.service';
import { IUser } from '@domain/community/user/user.interface';
import { UserIdentityDeletionException } from '@common/exceptions';
import { InstrumentResolver } from '@src/apm/decorators';

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

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description:
      'Remove the Kratos account associated with the specified User. Note: the Users profile on the platform is not deleted.',
  })
  async adminUserAccountDelete(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('userID', { type: () => UUID }) userID: string
  ): Promise<IUser> {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `Remove Kratos account for User ${userID}: ${agentInfo.email}`
    );

    const user = await this.userService.getUserOrFail(userID);
    try {
      await this.kratosService.deleteIdentityByEmail(user.email);
      this.logger.verbose?.(
        `Account associated with User ${user.email} has been deleted`,
        LogContext.AUTH
      );
    } catch (error: any) {
      this.logger.error?.(
        `Failed to delete account for User ID ${userID}: ${error.message}`,
        LogContext.AUTH
      );
      throw new UserIdentityDeletionException('Failed to delete user account');
    }
    return user;
  }
}
