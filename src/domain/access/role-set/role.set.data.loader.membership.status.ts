import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { RoleSetService } from './role.set.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IRoleSet } from './role.set.interface';

export type MembershipStatusKey = {
  agentInfo: AgentInfo;
  roleSet: IRoleSet;
};

@Injectable({ scope: Scope.REQUEST })
export class RoleSetMembershipStatusDataLoader {
  public readonly loader: DataLoader<
    MembershipStatusKey,
    CommunityMembershipStatus
  >;

  constructor(private readonly roleSetService: RoleSetService) {
    this.loader = new DataLoader<
      MembershipStatusKey,
      CommunityMembershipStatus
    >(
      async (keys: readonly MembershipStatusKey[]) => {
        return Promise.all(
          keys.map(({ agentInfo, roleSet }) =>
            this.roleSetService.getMembershipStatus(agentInfo, roleSet)
          )
        );
      },
      {
        cacheKeyFn: (key: MembershipStatusKey) => key,
      }
    );
  }
}
