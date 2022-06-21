import { IDataloaders } from './dataloader.interface';
import DataLoader from 'dataloader';
import { Injectable } from '@nestjs/common';
import { IProfile } from '@domain/community';
import { ILocation, IReference, ITagset, IVisual } from '@domain/common';
import { ProfileDataloaderService } from '@domain/community/profile/profile.dataloader.service';
import { UserDataloaderService } from '@domain/community/user/user.dataloader.service';
import { OrganizationDataloaderService } from '@domain/community/organization/organization.dataloader.service';

@Injectable()
export class DataloaderService {
  constructor(
    private readonly userDataloaderService: UserDataloaderService,
    private readonly orgDataloaderService: OrganizationDataloaderService,
    private readonly profileDataloaderService: ProfileDataloaderService
  ) {}

  createLoaders(): IDataloaders {
    const userProfileLoader = new DataLoader<string, IProfile>(
      async (keys: readonly string[]) =>
        this.userDataloaderService.findProfilesByBatch(keys as string[])
    );
    const orgProfileLoader = new DataLoader<string, IProfile>(
      async (keys: readonly string[]) =>
        this.orgDataloaderService.findProfilesByBatch(keys as string[])
    );
    const referencesLoader = new DataLoader<string, IReference[]>(
      async (keys: readonly string[]) =>
        this.profileDataloaderService.findReferencesByBatch(keys as string[])
    );
    const avatarsLoader = new DataLoader<string, IVisual>(
      async (keys: readonly string[]) =>
        this.profileDataloaderService.findAvatarsByBatch(keys as string[])
    );
    const tagsetsLoader = new DataLoader<string, ITagset[]>(
      async (keys: readonly string[]) =>
        this.profileDataloaderService.findTagsetsByBatch(keys as string[])
    );
    const locationsLoader = new DataLoader<string, ILocation>(
      async (keys: readonly string[]) =>
        this.profileDataloaderService.findLocationsByBatch(keys as string[])
    );
    return {
      userProfileLoader,
      orgProfileLoader,
      referencesLoader,
      avatarsLoader,
      tagsetsLoader,
      locationsLoader,
    };
  }
}
