import DataLoader from 'dataloader';
import { Injectable } from '@nestjs/common';
import { ILocation } from '@domain/common/location/location.interface';
import { IReference } from '@domain/common/reference/reference.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { ProfileDataloaderService } from '@domain/common/profile/profile.dataloader.service';
import { UserDataloaderService } from '@domain/community/user/user.dataloader.service';
import { OrganizationDataloaderService } from '@domain/community/organization/organization.dataloader.service';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { CollaborationDataloaderService } from '@domain/collaboration/collaboration/collaboration.dataloader.service';
import { IRelation } from '@domain/collaboration/relation/relation.interface';
import { IDataloaders } from './dataloader.interface';
import { IProfile } from '@domain/common/profile/profile.interface';

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
      tagsetsLoader,
      locationsLoader,
      calloutsLoader,
      relationsLoader,
    };
  }
}
