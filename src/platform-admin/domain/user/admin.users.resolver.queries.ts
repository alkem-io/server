import { Args, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { UserService } from '@domain/community/user/user.service';
import { AdminUserIdentityDto } from './dto/admin.user.identity.dto';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class AdminUsersQueries {
  constructor(
    private authorizationService: AuthorizationService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private userService: UserService
  ) {}

  @Query(() => AdminUserIdentityDto, {
    nullable: false,
    description:
      'Fetch the Kratos identity mapping for a user. Accessible to platform administrators only.',
  })
  async adminUserIdentity(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('userID', { type: () => UUID }) userID: string
  ): Promise<AdminUserIdentityDto> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `adminUserIdentity:${userID}`
    );

    const user = await this.userService.getUserOrFail(userID);

    return {
      userId: user.id,
      email: user.email,
      authId: user.authId ?? null,
      accountUpn: user.accountUpn,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}
