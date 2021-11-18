import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationPrivilege, AuthorizationRoleGlobal } from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization';
import { CurrentUser, Profiling } from '@common/decorators';
import { AgentInfo } from '@core/authentication';
import { CommunicationAdminEnsureAccessInput } from './dto/admin.communication.dto.ensure.access.input';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AdminCommunicationService } from './admin.communication.service';

@Resolver()
export class AdminCommunicationResolverMutations {
  private communicationGlobalAdminPolicy: IAuthorizationPolicy;

  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private adminCommunicationService: AdminCommunicationService
  ) {
    this.communicationGlobalAdminPolicy =
      this.authorizationPolicyService.createGlobalRolesAuthorizationPolicy(
        [AuthorizationRoleGlobal.ADMIN],
        [AuthorizationPrivilege.GRANT]
      );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => Boolean, {
    description:
      'Ensure all community members are registered for communications.',
  })
  @Profiling.api
  async adminCommunicationEnsureAccessToCommunications(
    @Args('communicationData')
    grantCredentialData: CommunicationAdminEnsureAccessInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<boolean> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.communicationGlobalAdminPolicy,
      AuthorizationPrivilege.GRANT,
      `grant community members access to communications: ${agentInfo.email}`
    );
    return await this.adminCommunicationService.ensureCommunityAccessToCommunications(
      grantCredentialData
    );
  }
}
