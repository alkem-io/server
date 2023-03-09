import DataLoader from 'dataloader';
import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { IProfile, User } from '@src/domain';
import { InjectRepository } from '@nestjs/typeorm';
import { DataLoaderCreator, DataLoaderCreatorOptions } from './base';
import { findByBatchIds } from '@core/dataloader/utils/findByBatchIds';

@Injectable()
export class UserProfileLoaderCreator implements DataLoaderCreator<IProfile> {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  create(options?: DataLoaderCreatorOptions<IProfile>) {
    return new DataLoader<string, IProfile>(
      keys =>
        findByBatchIds<User, IProfile>(
          this.userRepository,
          keys as string[],
          'profile'
        ),
      {
        cache: options?.cache,
        name: 'UserProfileLoaderCreator',
      }
    );
  }
}
