import DataLoader from 'dataloader';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { IProfile, User } from '@src/domain';
import { findByBatchIds } from '../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';

@Injectable()
export class UserProfileLoaderCreator implements DataLoaderCreator<IProfile> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IProfile>) {
    return new DataLoader<string, IProfile>(
      keys =>
        findByBatchIds<User, IProfile>(
          { manager: this.manager, classRef: User },
          keys as string[],
          'profile',
          options
        ),
      {
        cache: options?.cache,
        name: 'UserProfileLoaderCreator',
      }
    );
  }
}
