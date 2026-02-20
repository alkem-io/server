import { ActorType } from '@common/enums/actor.type';
import {
  DataLoaderCreator,
  DataLoaderCreatorBaseOptions,
} from '@core/dataloader/creators/base';
import { createBatchLoader } from '@core/dataloader/utils';
import { Actor } from '@domain/actor/actor/actor.entity';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';

@Injectable()
export class CommunityTypeLoaderCreator
  implements DataLoaderCreator<{ id: string; type: ActorType }>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorBaseOptions<any, any>) {
    return createBatchLoader(this.communityTypeInBatch, {
      name: this.constructor.name,
      loadedTypeName: 'CommunityContributorType',
      resolveToNull: options?.resolveToNull,
    });
  }

  private async communityTypeInBatch(
    keys: ReadonlyArray<string>
  ): Promise<{ id: string; type: ActorType }[]> {
    // Query actor table directly using the type discriminator column
    const actors = await this.manager.find(Actor, {
      where: {
        id: In([...keys]),
        type: In([
          ActorType.USER,
          ActorType.ORGANIZATION,
          ActorType.VIRTUAL_CONTRIBUTOR,
        ]),
      },
      select: { id: true, type: true },
    });

    return actors.map(actor => ({ id: actor.id, type: actor.type }));
  }
}
