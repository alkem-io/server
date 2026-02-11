import { RoleName } from '@common/enums/role.name';
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { RoleSetService } from './role.set.service';
import { AgentRoleKey } from './types';

@Injectable({ scope: Scope.REQUEST })
export class RoleSetAgentRolesDataLoader {
  public readonly loader: DataLoader<AgentRoleKey, RoleName[], string>;

  constructor(private readonly roleSetService: RoleSetService) {
    this.loader = new DataLoader<AgentRoleKey, RoleName[], string>(
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
        cacheKeyFn: (key: AgentRoleKey) =>
          `${key.agentInfo.agentID}-${key.roleSet.id}`,
      }
    );
  }
}
