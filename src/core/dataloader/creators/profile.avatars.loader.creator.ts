import DataLoader from 'dataloader';
import { Injectable } from '@nestjs/common';
import { ProfileDataloaderService } from '@domain/community/profile/profile.dataloader.service';
import { IVisual } from '@domain/common/visual';
import { DataLoaderCreator } from './base/data.loader.creator';
import { DataLoaderCreatorOptions } from '../creators/base/data.loader.creator.options';

@Injectable()
export class ProfileAvatarsLoaderCreator implements DataLoaderCreator<IVisual> {
  constructor(private readonly profileService: ProfileDataloaderService) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  create(options?: DataLoaderCreatorOptions) {
    return new DataLoader<string, IVisual>(async keys =>
      this.profileService.findAvatarsByBatch(keys as string[])
    );
  }
}
