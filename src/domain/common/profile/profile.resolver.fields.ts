import { LogContext } from '@common/enums';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { TagsetType } from '@common/enums/tagset.type';
import { VisualType } from '@common/enums/visual.type';
import { EntityNotFoundException } from '@common/exceptions';
import {
  ProfileLocationLoaderCreator,
  ProfileReferencesLoaderCreator,
  ProfileStorageBucketLoaderCreator,
  ProfileTagsetsLoaderCreator,
  VisualLoaderCreator,
} from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators/data.loader.decorator';
import { ILoader } from '@core/dataloader/loader.interface';
import { ILocation } from '@domain/common/location/location.interface';
import { Profile } from '@domain/common/profile/profile.entity';
import { ProfileService } from '@domain/common/profile/profile.service';
import { IReference } from '@domain/common/reference/reference.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { IVisual } from '@domain/common/visual/visual.interface';
import {
  DELETED_USER_SENTINEL_ID,
  DELETED_USER_SENTINEL_STORAGE_BUCKET,
} from '@domain/community/user/account-deletion/deleted.user.sentinel';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { UrlGeneratorService } from '@services/infrastructure/url-generator';
import { IProfile } from './profile.interface';

@Resolver(() => IProfile)
export class ProfileResolverFields {
  constructor(
    private profileService: ProfileService,
    private urlGeneratorService: UrlGeneratorService
  ) {}

  @ResolveField('visual', () => IVisual, {
    nullable: true,
    description: 'A particular type of visual for this Profile.',
  })
  async visual(
    @Parent() profile: IProfile,
    @Args('type', { type: () => VisualType }) type: VisualType,
    @Loader(VisualLoaderCreator, { parentClassRef: Profile })
    loader: ILoader<IVisual[]>
  ): Promise<IVisual | undefined> {
    // The deleted-user sentinel's profile id (see `UserResolverFields.profile`)
    // is never a real `profile` row, so every loader below is keyed on an
    // id that will never resolve. Short-circuit before any of them run,
    // rather than let a nullable loader resolve to `null` and crash the
    // array lookup below, or a non-null one reject the whole field.
    if (profile.id === DELETED_USER_SENTINEL_ID) {
      return undefined;
    }
    const visuals = await loader.load(profile.id);
    return visuals.find(v => v.name === type);
  }

  @ResolveField('visuals', () => [IVisual], {
    nullable: false,
    description: 'A list of visuals for this Profile.',
  })
  async visuals(
    @Parent() profile: IProfile,
    @Loader(VisualLoaderCreator, { parentClassRef: Profile })
    loader: ILoader<IVisual[]>
  ): Promise<IVisual[]> {
    if (profile.id === DELETED_USER_SENTINEL_ID) {
      return [];
    }
    return loader.load(profile.id);
  }

  @ResolveField('references', () => [IReference], {
    nullable: true,
    description: 'A list of URLs to relevant information.',
  })
  async references(
    @Parent() profile: IProfile,
    @Loader(ProfileReferencesLoaderCreator) loader: ILoader<IReference[]>
  ): Promise<IReference[]> {
    if (profile.id === DELETED_USER_SENTINEL_ID) {
      return [];
    }
    return loader.load(profile.id);
  }

  @ResolveField('tagset', () => ITagset, {
    nullable: true,
    description: 'The default or named tagset.',
  })
  async tagset(
    @Parent() profile: IProfile,
    @Args('tagsetName', {
      type: () => TagsetReservedName,
      nullable: true,
    })
    tagsetName: TagsetReservedName,
    @Loader(ProfileTagsetsLoaderCreator)
    loader: ILoader<ITagset[]>
  ): Promise<ITagset | undefined> {
    if (profile.id === DELETED_USER_SENTINEL_ID) {
      return undefined;
    }
    const tagsets = await loader.load(profile.id);
    if (!tagsetName) {
      const defaultTagset = tagsets.find(
        t =>
          t.type === TagsetType.FREEFORM &&
          t.name.toLowerCase() === TagsetReservedName.DEFAULT
      );
      if (!defaultTagset) {
        throw new EntityNotFoundException(
          `Unable to locate DEFAULT tagset for profile: ${profile.id}`,
          LogContext.PROFILE
        );
      }
      return defaultTagset;
    }

    const namedTagset = tagsets.find(t => t.name.toLowerCase() === tagsetName);
    if (!namedTagset) {
      throw new EntityNotFoundException(
        `Unable to locate ${tagsetName} tagset for profile: ${profile.id}`,
        LogContext.PROFILE
      );
    }

    return namedTagset;
  }

  @ResolveField('tagsets', () => [ITagset], {
    nullable: true,
    description: 'A list of named tagsets, each of which has a list of tags.',
  })
  async tagsets(
    @Parent() profile: IProfile,
    @Loader(ProfileTagsetsLoaderCreator) loader: ILoader<ITagset[]>
  ): Promise<ITagset[]> {
    if (profile.id === DELETED_USER_SENTINEL_ID) {
      return [];
    }
    return loader.load(profile.id);
  }

  @ResolveField('location', () => ILocation, {
    nullable: true,
    description: 'The location for this Profile.',
  })
  async location(
    @Parent() profile: IProfile,
    @Loader(ProfileLocationLoaderCreator) loader: ILoader<ILocation>
  ): Promise<ILocation | undefined> {
    if (profile.id === DELETED_USER_SENTINEL_ID) {
      return undefined;
    }
    return loader.load(profile.id);
  }

  @ResolveField('storageBucket', () => IStorageBucket, {
    nullable: false,
    description: 'The storage bucket for this Profile.',
  })
  async storageBucket(
    @Parent() profile: IProfile,
    @Loader(ProfileStorageBucketLoaderCreator) loader: ILoader<IStorageBucket>
  ): Promise<IStorageBucket> {
    if (profile.id === DELETED_USER_SENTINEL_ID) {
      return DELETED_USER_SENTINEL_STORAGE_BUCKET;
    }
    return loader.load(profile.id);
  }

  @ResolveField(() => String, {
    nullable: false,
    description: 'The URL at which this profile can be viewed.',
  })
  async url(@Parent() profile: IProfile): Promise<string> {
    // The sentinel's profile is never actually viewable — it stands in for
    // an account that no longer exists — so there is no real URL to
    // generate; `generateUrlForProfileNotCached` would otherwise fall
    // through its `ProfileType` switch and throw for the sentinel's
    // unset `type`.
    if (profile.id === DELETED_USER_SENTINEL_ID) {
      return '';
    }
    return await this.urlGeneratorService.generateUrlForProfile(profile);
  }
}
