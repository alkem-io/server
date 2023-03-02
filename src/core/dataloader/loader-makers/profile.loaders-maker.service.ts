import DataLoader from 'dataloader';
import { Injectable } from '@nestjs/common';
import { ProfileDataloaderService } from '@domain/community/profile/profile.dataloader.service';
import { IReference } from '@domain/common/reference';
import { IVisual } from '@domain/common/visual';
import { ITagset } from '@domain/common/tagset';
import { ILocation } from '@domain/common/location';

@Injectable()
export class ProfileLoadersMaker {
  constructor(
    private readonly profileDataloaderService: ProfileDataloaderService
  ) {}

  public references(options?: DataLoader.Options<any, any>) {
    return new DataLoader<string, IReference[]>(
      async (keys: readonly string[]) =>
        this.profileDataloaderService.findReferencesByBatch(keys as string[])
    );
  }

  public avatar() {
    return new DataLoader<string, IVisual>(async (keys: readonly string[]) =>
      this.profileDataloaderService.findAvatarsByBatch(keys as string[])
    );
  }

  public tagsets() {
    return new DataLoader<string, ITagset[]>(async (keys: readonly string[]) =>
      this.profileDataloaderService.findTagsetsByBatch(keys as string[])
    );
  }

  public location() {
    return new DataLoader<string, ILocation>(async (keys: readonly string[]) =>
      this.profileDataloaderService.findLocationsByBatch(keys as string[])
    );
  }
}
