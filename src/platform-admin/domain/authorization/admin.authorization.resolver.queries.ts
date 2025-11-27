import { CurrentUser } from '@src/common/decorators';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { IUser } from '@domain/community/user/user.interface';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AdminAuthorizationService } from './admin.authorization.service';
import { UsersWithAuthorizationCredentialInput } from './dto/authorization.dto.users.with.credential';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class AdminAuthorizationResolverQueries {
  constructor(
    private authorizationService: AuthorizationService,
    private adminAuthorizationService: AdminAuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @Query(() => [IUser], {
    nullable: false,
    description:
      'All Users that hold credentials matching the supplied criteria.',
  })
  async usersWithAuthorizationCredential(
    @Args('credentialsCriteriaData', { nullable: false })
    credentialsCriteriaData: UsersWithAuthorizationCredentialInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IUser[]> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `authorization query: ${agentInfo.userID}`
    );
    return await this.adminAuthorizationService.usersWithCredentials(
      credentialsCriteriaData
    );
  }
}
