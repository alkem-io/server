import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Profile } from '@src/domain';
import { IVisual } from '@domain/common/visual';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';
import { createTypedDataLoader } from '@core/dataloader/utils/createTypedLoader';

@Injectable()
export class ProfileAvatarsLoaderCreator implements DataLoaderCreator<IVisual> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IVisual>) {
    return createTypedDataLoader(
      this.manager,
      Profile,
      'avatar',
      this.constructor.name,
      options
    );
  }
}
