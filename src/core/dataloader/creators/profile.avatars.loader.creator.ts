import DataLoader from 'dataloader';
import { Injectable } from '@nestjs/common';
import { ProfileDataloaderService } from '@domain/community/profile/profile.dataloader.service';
import { IVisual } from '@domain/common/visual';
import { DataLoaderCreator } from '../data.loader.creator';

@Injectable()
export class ProfileAvatarsLoaderCreator implements DataLoaderCreator<IVisual> {
  constructor(private readonly profileService: ProfileDataloaderService) {}

  create() {
    return new DataLoader<string, IVisual>(async keys =>
      this.profileService.findAvatarsByBatch(keys as string[])
    );
  }
}
