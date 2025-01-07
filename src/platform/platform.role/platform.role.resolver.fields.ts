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
import { RoleName } from '@common/enums/role.name';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IPlatform } from '@platform/platform/platform.interface';

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
  @ResolveField('myRoles', () => [RoleName], {
    nullable: false,
    description: 'The roles on the Platform for the currently logged in user.',
  })
  async myRoles(@CurrentUser() agentInfo: AgentInfo): Promise<RoleName[]> {
    return this.platformRoleService.getPlatformRoles(agentInfo);
  }
}
