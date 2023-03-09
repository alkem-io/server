import DataLoader from 'dataloader';
import { Injectable } from '@nestjs/common';
import { IVisual } from '@domain/common/visual';
import { DataLoaderCreator } from './base/data.loader.creator';
import { DataLoaderCreatorOptions } from '../creators/base/data.loader.creator.options';
import { InjectRepository } from '@nestjs/typeorm';
import { Profile } from '@src/domain';
import { Repository } from 'typeorm';
import { findByBatchIds } from '@core/dataloader/utils/findByBatchIds';

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
          'avatar'
        ),
      {
        cache: options?.cache,
        name: 'ProfileAvatarsLoaderCreator',
      }
    );
  }
}
