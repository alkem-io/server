import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Profile } from '@src/domain';
import { IVisual } from '@domain/common/visual';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';
import { createTypedDataLoader, createTypedDataLoaderNew } from '@core/dataloader/utils/createTypedLoader';

@Injectable()
export class ProfileAvatarsLoaderCreator implements DataLoaderCreator<IVisual> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IVisual>) {
    return createTypedDataLoaderNew(
      this.manager,
      Profile,
      { avatar: true },
      this.constructor.name,
      options
    );
  }
}
