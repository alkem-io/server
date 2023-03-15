import DataLoader from 'dataloader';
import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Profile } from '@src/domain';
import { IVisual } from '@domain/common/visual';
import { DataLoaderCreator, DataLoaderCreatorOptions } from './base';
import { findByBatchIds } from '../utils';

@Injectable()
export class ProfileAvatarsLoaderCreator implements DataLoaderCreator<IVisual> {
  constructor(
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>
  ) {}

  create(options?: DataLoaderCreatorOptions<IVisual>) {
    return new DataLoader<string, IVisual>(
      async keys =>
        findByBatchIds<Profile, IVisual>(
          this.profileRepository,
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
