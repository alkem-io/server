import { Profiling } from '@common/decorators';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IVisual } from '@domain/common/visual/visual.interface';
import { IReference } from '@domain/common/reference/reference.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { ILocation } from '@domain/common/location/location.interface';
import { VisualType } from '@common/enums/visual.type';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { IProfile } from './profile.interface';
import { Profile } from '@domain/common/profile/profile.entity';
import { ProfileService } from '@domain/common/profile/profile.service';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators/data.loader.decorator';
import {
  ProfileLocationLoaderCreator,
  ProfileReferencesLoaderCreator,
  ProfileTagsetsLoaderCreator,
  VisualLoaderCreator,
} from '@core/dataloader/creators';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { TagsetType } from '@common/enums/tagset.type';
import { ProfileStorageBucketLoaderCreator } from '@core/dataloader/creators/loader.creators/profile/profile.storage.bucket.loader.creator';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator';

@Resolver(() => IProfile)
export class ProfileResolverFields {
  constructor(
    private profileService: ProfileService,
    private authorizationService: AuthorizationService,
    private urlGeneratorService: UrlGeneratorService
  ) {}

  @ResolveField('visual', () => IVisual, {
    nullable: true,
    description: 'A particular type of visual for this Profile.',
  })
  @Profiling.api
  async visual(
    @Parent() profile: IProfile,
    @Args('type', { type: () => VisualType }) type: VisualType
  ): Promise<IVisual | undefined> {
    return this.profileService.getVisual(profile, type);
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
  ): Promise<ITagset> {
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
    return loader.load(profile.id);
  }

  @ResolveField('location', () => ILocation, {
    nullable: true,
    description: 'The location for this Profile.',
  })
  async location(
    @Parent() profile: IProfile,
    @Loader(ProfileLocationLoaderCreator) loader: ILoader<ILocation>
  ): Promise<ILocation> {
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
    return loader.load(profile.id);
  }

  @ResolveField(() => String, {
    nullable: false,
    description: 'The URL at which this profile can be viewed.',
  })
  async url(@Parent() profile: IProfile): Promise<string> {
    return await this.urlGeneratorService.generateUrlForProfile(profile);
  }
}
