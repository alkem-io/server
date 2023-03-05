import DataLoader from 'dataloader';
import { Injectable } from '@nestjs/common';
import { ProfileDataloaderService } from '@domain/community/profile/profile.dataloader.service';
import { IVisual } from '@domain/common/visual';
import { DataLoaderCreator } from '../data.loader.interface';

@Injectable()
export class ProfileAvatarsLoader implements DataLoaderCreator<IVisual> {
  constructor(private readonly profileService: ProfileDataloaderService) {}

  create() {
    const avatarsLoader = new DataLoader<string, IVisual>(
      async (keys: readonly string[]) =>
        this.profileService.findAvatarsByBatch(keys as string[])
    );

    return avatarsLoader;
  }
}
