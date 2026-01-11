import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { RoleSetService } from './role.set.service';
import { ActorRoleKey } from './types';

@Injectable({ scope: Scope.REQUEST })
export class RoleSetMembershipStatusDataLoader {
  public readonly loader: DataLoader<
    ActorRoleKey,
    CommunityMembershipStatus,
    string
  >;

  constructor(private readonly roleSetService: RoleSetService) {
    this.loader = new DataLoader<
      ActorRoleKey,
      CommunityMembershipStatus,
      string
    >(
      async (keys: readonly ActorRoleKey[]) => {
        // Batch each key concurrently using getRolesForActorContext.
        return Promise.all(
          keys.map(({ actorContext, roleSet }) =>
            this.roleSetService.getMembershipStatusByActorContext(
              actorContext,
              roleSet
            )
          )
        );
      },
      {
        // Assuming actorContext and roleSet have an id property
        cacheKeyFn: (key: ActorRoleKey) =>
          `${key.actorContext.actorId}-${key.roleSet.id}`,
      }
    );
  }
}
