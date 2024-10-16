import { ResolveField, Resolver } from '@nestjs/graphql';

import {
  AuthorizationAgentPrivilege,
  CurrentUser,
  Profiling,
} from '@src/common/decorators';
import { PlatformRoleService } from './platform.role.service';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { IPlatformInvitation } from '@platform/invitation/platform.invitation.interface';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { PlatformRole } from '@common/enums/platform.role';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IPlatform } from '@platform/platfrom/platform.interface';

@Resolver(() => IPlatform)
export class PlatformRoleResolverFields {
  constructor(private platformRoleService: PlatformRoleService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('platformInvitations', () => [IPlatformInvitation], {
    nullable: false,
    description:
      'Invitations to join roles for users not yet on the Alkemio platform.',
  })
  @Profiling.api
  async platformInvitations(): Promise<IPlatformInvitation[]> {
    return await this.platformRoleService.getPlatformInvitationsForRole();
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('myRoles', () => [PlatformRole], {
    nullable: false,
    description: 'The roles on the Platform for the currently logged in user.',
  })
  async myRoles(@CurrentUser() agentInfo: AgentInfo): Promise<PlatformRole[]> {
    return this.platformRoleService.getPlatformRoles(agentInfo);
  }
}
