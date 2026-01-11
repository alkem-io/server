import { EntityManager, In } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import {
  DataLoaderCreator,
  DataLoaderCreatorBaseOptions,
} from '@core/dataloader/creators/base';
import { createBatchLoader } from '@core/dataloader/utils';
import { ILoader } from '@core/dataloader/loader.interface';
import { IActor } from '@domain/actor/actor/actor.interface';
import { Actor } from '@domain/actor/actor/actor.entity';
import { EntityNotFoundException } from '@common/exceptions';
import { ActorType } from '@common/enums/actor.type';

@Injectable()
export class ActorLoaderCreator implements DataLoaderCreator<IActor> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  public create(
    options?: DataLoaderCreatorBaseOptions<any, any>
  ): ILoader<IActor | null | EntityNotFoundException> {
    return createBatchLoader(this.actorsInBatch, {
      name: this.constructor.name,
      loadedTypeName: 'Actor',
      resolveToNull: options?.resolveToNull,
    });
  }

  // Query Actor table directly - TypeORM's Class Table Inheritance returns correct child entity instances
  // Actor.type is used to resolve the actual entity type (User, Organization, VirtualContributor)
  private actorsInBatch = async (
    keys: ReadonlyArray<string>
  ): Promise<IActor[]> => {
    // Query Actor directly - only load contributor types (User, Organization, VirtualContributor)
    const actors = await this.manager.find(Actor, {
      where: {
        id: In([...keys]),
        type: In([ActorType.USER, ActorType.ORGANIZATION, ActorType.VIRTUAL]),
      },
    });

    return actors;
  };
}
