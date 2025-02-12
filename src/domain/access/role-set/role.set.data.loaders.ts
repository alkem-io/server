import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { IRoleSet } from './role.set.interface';
import { RoleSetService } from './role.set.service';
import { RoleName } from '@common/enums/role.name';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';

export type AgentRoleKey = {
  agentInfo: AgentInfo;
  roleSet: IRoleSet;
};

@Injectable({ scope: Scope.REQUEST })
export class RoleSetAgentRolesDataLoader {
  public readonly loader: DataLoader<AgentRoleKey, RoleName[]>;

  constructor(private readonly roleSetService: RoleSetService) {
    this.loader = new DataLoader<AgentRoleKey, RoleName[]>(
      async (keys: readonly AgentRoleKey[]) => {
        // Batch each key concurrently using getRolesForAgentInfo.
        return Promise.all(
          keys.map(({ agentInfo, roleSet }) =>
            this.roleSetService.getRolesForAgentInfo(agentInfo, roleSet)
          )
        );
      },
      {
        // Use a composite key string to avoid duplicate lookups in a single request.
        cacheKeyFn: (key: AgentRoleKey) => key,
      }
    );
  }
}
