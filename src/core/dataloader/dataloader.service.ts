import DataLoader from 'dataloader';
import { Injectable } from '@nestjs/common';
import { IProfile } from '@domain/community';
import { ILocation } from '@domain/common/location/location.interface';
import { IReference } from '@domain/common/reference/reference.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { IVisual } from '@domain/common/visual/visual.interface';
import { ProfileDataloaderService } from '@domain/community/profile/profile.dataloader.service';
import { UserDataloaderService } from '@domain/community/user/user.dataloader.service';
import { OrganizationDataloaderService } from '@domain/community/organization/organization.dataloader.service';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { CollaborationDataloaderService } from '@domain/collaboration/collaboration/collaboration.dataloader.service';
import { IRelation } from '@domain/collaboration/relation/relation.interface';
import { DataLoaderNames } from './data.loader.names';
import { IDataloaders } from './dataloader.interface';
import { ILazyDataloaders } from './dataloader.lazy.interface';

@Injectable()
export class DataloaderService {
  constructor(
    private readonly userDataloaderService: UserDataloaderService,
    private readonly orgDataloaderService: OrganizationDataloaderService,
    private readonly profileDataloaderService: ProfileDataloaderService,
    private readonly collaborationDataloaderService: CollaborationDataloaderService
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
    const calloutsLoader = new DataLoader<string, ICallout[]>(
      async (keys: readonly string[]) =>
        this.collaborationDataloaderService.findCalloutsByBatch(
          keys as string[]
        )
    );
    const relationsLoader = new DataLoader<string, IRelation[]>(
      async (keys: readonly string[]) =>
        this.collaborationDataloaderService.findRelationsByBatch(
          keys as string[]
        )
    );

    return {
      userProfileLoader,
      orgProfileLoader,
      referencesLoader,
      avatarsLoader,
      tagsetsLoader,
      locationsLoader,
      calloutsLoader,
      relationsLoader,
    };
  }

  createLazyLoaders(): ILazyDataloaders {
    return {
      userProfileLoader: () =>
        new DataLoader<string, IProfile>(async (keys: readonly string[]) =>
          this.userDataloaderService.findProfilesByBatch(keys as string[])
        ),
      orgProfileLoader: () =>
        new DataLoader<string, IProfile>(async (keys: readonly string[]) =>
          this.orgDataloaderService.findProfilesByBatch(keys as string[])
        ),
      referencesLoader: () =>
        new DataLoader<string, IReference[]>(async (keys: readonly string[]) =>
          this.profileDataloaderService.findReferencesByBatch(keys as string[])
        ),
      avatarsLoader: () =>
        new DataLoader<string, IVisual>(async (keys: readonly string[]) =>
          this.profileDataloaderService.findAvatarsByBatch(keys as string[])
        ),
      tagsetsLoader: () =>
        new DataLoader<string, ITagset[]>(async (keys: readonly string[]) =>
          this.profileDataloaderService.findTagsetsByBatch(keys as string[])
        ),
      locationsLoader: () =>
        new DataLoader<string, ILocation>(async (keys: readonly string[]) =>
          this.profileDataloaderService.findLocationsByBatch(keys as string[])
        ),
      calloutsLoader: () =>
        new DataLoader<string, ICallout[]>(async (keys: readonly string[]) =>
          this.collaborationDataloaderService.findCalloutsByBatch(
            keys as string[]
          )
        ),
      relationsLoader: () =>
        new DataLoader<string, IRelation[]>(async (keys: readonly string[]) =>
          this.collaborationDataloaderService.findRelationsByBatch(
            keys as string[]
          )
        ),
    };
  }

  // get(loaderName: DataLoaderNames) {
  //   if (!this.loaders[loaderName]) {
  //     this.loaders[loaderName] = createLoader(loaderName)
  //   }
  //   return this.loaders[loaderName] as Loaders<T>
  // }
}
