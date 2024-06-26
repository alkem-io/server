import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { DeletePlatformInvitationInput } from './dto/platform.invitation.dto.delete';
import { PlatformInvitationService } from './platform.invitation.service';
import { IPlatformInvitation } from './platform.invitation.interface';
import { CreatePlatformInvitationForRoleInput } from './dto/platform.invitation.dto.global.role';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';

@Resolver()
export class PlatformInvitationResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private platformInvitationService: PlatformInvitationService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IPlatformInvitation, {
    description:
      'Invite a User to join the platform and the specified Community as a member.',
  })
  async createPlatformInvitationForRole(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('invitationData')
    invitationData: CreatePlatformInvitationForRoleInput
  ): Promise<IPlatformInvitation> {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `invitation to platform in global role: ${invitationData.email}`
    );
    const platformInvitation =
      await this.platformInvitationService.createPlatformInvitation(
        invitationData
      );
    return platformInvitation;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IPlatformInvitation, {
    description: 'Removes the specified User platformInvitation.',
  })
  async deletePlatformInvitation(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeletePlatformInvitationInput
  ): Promise<IPlatformInvitation> {
    const platformInvitation =
      await this.platformInvitationService.getPlatformInvitationOrFail(
        deleteData.ID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      platformInvitation.authorization,
      AuthorizationPrivilege.DELETE,
      `delete platformInvitation to community: ${platformInvitation.id}`
    );
    return await this.platformInvitationService.deletePlatformInvitation(
      deleteData
    );
  }
}
