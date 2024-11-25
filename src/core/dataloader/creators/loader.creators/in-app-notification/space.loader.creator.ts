import { EntityManager, In } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { DataLoaderCreator } from '@core/dataloader/creators/base';
import { createBatchLoader } from '@core/dataloader/utils';
import { ILoader } from '@core/dataloader/loader.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { Space } from '@domain/space/space/space.entity';

@Injectable()
export class SpaceLoaderCreator implements DataLoaderCreator<ISpace> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  public create(): ILoader<ISpace> {
    return createBatchLoader(
      this.constructor.name,
      Space.name,
      this.spaceInBatch
    );
  }

  private spaceInBatch = (keys: ReadonlyArray<string>): Promise<Space[]> => {
    return this.manager.findBy(Space, { id: In(keys) });
  };
}
