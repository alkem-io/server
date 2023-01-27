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
import { CommunicationAdminRemoveOrphanedRoomInput } from './dto/admin.communication.dto.remove.orphaned.room';
import { CommunicationAdminUpdateRoomsJoinRuleInput } from './dto/admin.communication.dto.update.rooms.joinrule';

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
        [AuthorizationRoleGlobal.GLOBAL_ADMIN],
        [AuthorizationPrivilege.GRANT],
        'adminCommunicationGrant'
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
    ensureAccessData: CommunicationAdminEnsureAccessInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<boolean> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.communicationGlobalAdminPolicy,
      AuthorizationPrivilege.GRANT,
      `grant community members access to communications: ${agentInfo.email}`
    );
    return await this.adminCommunicationService.ensureCommunityAccessToCommunications(
      ensureAccessData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => Boolean, {
    description: 'Remove an orphaned room from messaging platform.',
  })
  @Profiling.api
  async adminCommunicationRemoveOrphanedRoom(
    @Args('orphanedRoomData')
    orphanedRoomData: CommunicationAdminRemoveOrphanedRoomInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<boolean> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.communicationGlobalAdminPolicy,
      AuthorizationPrivilege.GRANT,
      `communications admin remove orphaned room: ${agentInfo.email}`
    );
    return await this.adminCommunicationService.removeOrphanedRoom(
      orphanedRoomData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => Boolean, {
    description: 'Allow updating the rule for joining rooms: public or invite.',
  })
  @Profiling.api
  async adminCommunicationUpdateRoomsJoinRule(
    @Args('changeRoomAccessData')
    changeRoomAccessData: CommunicationAdminUpdateRoomsJoinRuleInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<boolean> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.communicationGlobalAdminPolicy,
      AuthorizationPrivilege.GRANT,
      `communications admin update join rule on all rooms: ${agentInfo.email}`
    );
    return await this.adminCommunicationService.setMatrixRoomsJoinRule(
      changeRoomAccessData.isPublic
    );
  }
}
