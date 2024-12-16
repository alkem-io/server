import { EntityManager, In } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import {
  DataLoaderCreator,
  DataLoaderCreatorBaseOptions,
} from '@core/dataloader/creators/base';
import { createBatchLoader } from '@core/dataloader/utils';
import { ILoader } from '@core/dataloader/loader.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { Space } from '@domain/space/space/space.entity';
import { EntityNotFoundException } from '@common/exceptions';

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
