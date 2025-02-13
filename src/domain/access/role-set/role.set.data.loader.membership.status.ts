import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { RoleSetService } from './role.set.service';
import { AgentRoleKey } from './role.set.data.loaders.agent.roles';

@Injectable({ scope: Scope.REQUEST })
export class RoleSetMembershipStatusDataLoader {
  public readonly loader: DataLoader<
    AgentRoleKey,
    CommunityMembershipStatus,
    string
  >;

  constructor(private readonly roleSetService: RoleSetService) {
    this.loader = new DataLoader<
      AgentRoleKey,
      CommunityMembershipStatus,
      string
    >(
      async (keys: readonly AgentRoleKey[]) => {
        // Batch each key concurrently using getRolesForAgentInfo.
        return Promise.all(
          keys.map(({ agentInfo, roleSet }) =>
            this.roleSetService.getMembershipStatusByAgentInfo(
              agentInfo,
              roleSet
            )
          )
        );
      },
      {
        // Assuming agentInfo and roleSet have an id property
        cacheKeyFn: (key: AgentRoleKey) =>
          `${key.agentInfo.agentID}-${key.roleSet.id}`,
      }
    );
  }
}
