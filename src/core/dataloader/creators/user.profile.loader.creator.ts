import DataLoader from 'dataloader';
import { FindOptionsSelect, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { IProfile, User } from '@src/domain';
import { DataLoaderCreator, DataLoaderCreatorOptions } from './base';
import { findByBatchIdsNew } from '../utils/findByBatchIds';

@Injectable()
export class UserProfileLoaderCreator implements DataLoaderCreator<IProfile> {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  create(options?: DataLoaderCreatorOptions<IProfile>) {
    // todo: use this approach in https://app.zenhub.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/gh/alkem-io/server/2598
    const { fields = [], ...restOptions } = options ?? {};

    const a = fields.reduce<FindOptionsSelect<IProfile>>(
      (acc, val) => ({
        ...acc,
        [val]: true,
      }),
      {}
    );

    return new DataLoader<string, IProfile>(
      keys =>
        findByBatchIdsNew<User, IProfile>(
          this.userRepository,
          keys as string[],
          {
            profile: true,
          },
          {
            ...restOptions,
            fields: {
              id: true,
              profile: a,
            },
          }
        ),
      {
        cache: options?.cache,
        name: 'UserProfileLoaderCreator',
      }
    );
  }
}
