import { Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationPrivilege, AuthorizationRoleGlobal } from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization';
import { CurrentUser, Profiling } from '@common/decorators';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { GLOBAL_POLICY_ADMIN_COMMUNICATION_GRANT } from '@common/constants/authorization/global.policy.constants';
import { AdminStorageService } from './admin.storage.service';

@Resolver()
export class AdminStorageResolverMutations {
  private storageGlobalAdminPolicy: IAuthorizationPolicy;

  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private adminStorageService: AdminStorageService
  ) {
    this.storageGlobalAdminPolicy =
      this.authorizationPolicyService.createGlobalRolesAuthorizationPolicy(
        [AuthorizationRoleGlobal.GLOBAL_ADMIN],
        [AuthorizationPrivilege.UPDATE],
        GLOBAL_POLICY_ADMIN_COMMUNICATION_GRANT
      );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => Boolean, {
    description: 'Migrate all ipfs links to use new storage access api',
  })
  @Profiling.api
  async adminStorageMigrateIpfsUrls(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<boolean> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.storageGlobalAdminPolicy,
      AuthorizationPrivilege.UPDATE,
      `admin storage update ipfs links: ${agentInfo.email}`
    );
    await this.adminStorageService.migrate(agentInfo);
    return true;
  }
}
