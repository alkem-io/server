import DataLoader from 'dataloader';
import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Profile } from '@src/domain';
import { IVisual } from '@domain/common/visual';
import { findByBatchIds } from '../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';

@Injectable()
export class ProfileAvatarsLoaderCreator implements DataLoaderCreator<IVisual> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IVisual>) {
    return new DataLoader<string, IVisual>(
      async keys =>
        findByBatchIds<Profile, IVisual>(
          { manager: this.manager, classRef: Profile },
          keys as string[],
          'avatar',
          options
        ),
      {
        cache: options?.cache,
        name: 'ProfileAvatarsLoaderCreator',
      }
    );
  }
}
