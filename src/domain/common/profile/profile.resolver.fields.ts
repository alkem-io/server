import { Profiling } from '@common/decorators';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IVisual } from '@domain/common/visual/visual.interface';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { IReference } from '@domain/common/reference/reference.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { ILocation } from '@domain/common/location/location.interface';
import { VisualType } from '@common/enums/visual.type';
import { RestrictedTagsetNames } from '../tagset/tagset.entity';
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
import { StorageBucketResolverService } from '@services/infrastructure/entity-resolver/storage.bucket.resolver.service';

@Resolver(() => IProfile)
export class ProfileResolverFields {
  constructor(
    private profileService: ProfileService,
    private storageBucketResolverService: StorageBucketResolverService
  ) {}

  @UseGuards(GraphqlGuard)
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

  @UseGuards(GraphqlGuard)
  @ResolveField('visuals', () => [IVisual], {
    nullable: false,
    description: 'A list of visuals for this Profile.',
  })
  @Profiling.api
  async visuals(
    @Parent() profile: IProfile,
    @Loader(VisualLoaderCreator, { parentClassRef: Profile })
    loader: ILoader<IVisual[]>
  ): Promise<IVisual[]> {
    return loader.load(profile.id);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('references', () => [IReference], {
    nullable: true,
    description: 'A list of URLs to relevant information.',
  })
  @Profiling.api
  async references(
    @Parent() profile: IProfile,
    @Loader(ProfileReferencesLoaderCreator) loader: ILoader<IReference[]>
  ): Promise<IReference[]> {
    return loader.load(profile.id);
  }

  // TODO: to make the switch for entities with a single tagset easier
  @UseGuards(GraphqlGuard)
  @ResolveField('tagset', () => ITagset, {
    nullable: true,
    description: 'The default tagset.',
  })
  @Profiling.api
  async tagset(
    @Parent() profile: IProfile,
    @Loader(ProfileTagsetsLoaderCreator)
    loader: ILoader<ITagset[]>
  ): Promise<ITagset> {
    const tagsets = await loader.load(profile.id);
    const defaultTagset = tagsets.find(
      t => t.name === RestrictedTagsetNames.DEFAULT
    );
    if (!defaultTagset) {
      throw new EntityNotFoundException(
        `Unable to locate DEFAULT tagset for profile: ${profile.id}`,
        LogContext.COMMUNITY
      );
    }
    return defaultTagset;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('tagsets', () => [ITagset], {
    nullable: true,
    description: 'A list of named tagsets, each of which has a list of tags.',
  })
  @Profiling.api
  async tagsets(
    @Parent() profile: IProfile,
    @Loader(ProfileTagsetsLoaderCreator) loader: ILoader<ITagset[]>
  ): Promise<ITagset[]> {
    return loader.load(profile.id);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('location', () => ILocation, {
    nullable: true,
    description: 'The location for this Profile.',
  })
  @Profiling.api
  async location(
    @Parent() profile: IProfile,
    @Loader(ProfileLocationLoaderCreator) loader: ILoader<ILocation>
  ): Promise<ILocation> {
    return loader.load(profile.id);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('storageBucket', () => IStorageBucket, {
    nullable: true,
    description: 'The storage bucket for this Profile.',
  })
  @Profiling.api
  async storageBucket(@Parent() profile: IProfile): Promise<IStorageBucket> {
    return this.storageBucketResolverService.getStorageBucketForProfile(
      profile.id
    );
  }
}
