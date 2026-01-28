import { createTypedRelationDataLoader } from '@core/dataloader/utils';
import { Profile } from '@domain/common/profile';
import { IVisual } from '@domain/common/visual';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class ProfileAvatarsLoaderCreator implements DataLoaderCreator<IVisual> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options: DataLoaderCreatorOptions<IVisual>) {
    return createTypedRelationDataLoader(
      this.manager,
      Profile,
      { avatar: true },
      this.constructor.name,
      options
    );
  }
}
