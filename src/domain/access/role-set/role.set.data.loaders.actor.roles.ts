import { RoleName } from '@common/enums/role.name';
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { RoleSetService } from './role.set.service';
import { ActorRoleKey } from './types';

@Injectable({ scope: Scope.REQUEST })
export class RoleSetActorRolesDataLoader {
  public readonly loader: DataLoader<ActorRoleKey, RoleName[], string>;

  constructor(private readonly roleSetService: RoleSetService) {
    this.loader = new DataLoader<ActorRoleKey, RoleName[], string>(
      async (keys: readonly ActorRoleKey[]) => {
        // Batch each key concurrently using getRolesForActorContext.
        return Promise.all(
          keys.map(({ actorContext, roleSet }) =>
            this.roleSetService.getRolesForActorContext(actorContext, roleSet)
          )
        );
      },
      {
        // Use a composite key string to avoid duplicate lookups in a single request.
        cacheKeyFn: (key: ActorRoleKey) =>
          `${key.actorContext.actorID}-${key.roleSet.id}`,
      }
    );
  }
}
