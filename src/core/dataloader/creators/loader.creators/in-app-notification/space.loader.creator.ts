import { EntityNotFoundException } from '@common/exceptions';
import {
  DataLoaderCreator,
  DataLoaderCreatorBaseOptions,
} from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { createBatchLoader } from '@core/dataloader/utils';
import { Space } from '@domain/space/space/space.entity';
import { ISpace } from '@domain/space/space/space.interface';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';

@Injectable()
export class SpaceLoaderCreator implements DataLoaderCreator<ISpace> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  public create(
    options?: DataLoaderCreatorBaseOptions<any, any>
  ): ILoader<ISpace | null | EntityNotFoundException> {
    return createBatchLoader(this.spaceInBatch, {
      name: this.constructor.name,
      loadedTypeName: Space.name,
      resolveToNull: options?.resolveToNull,
    });
  }

  private spaceInBatch = (keys: ReadonlyArray<string>): Promise<Space[]> => {
    return this.manager.findBy(Space, { id: In(keys) });
  };
}
