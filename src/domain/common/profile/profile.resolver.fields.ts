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
import { Loader } from '@core/dataloader/decorators/data.loader.decorator';
import {
  ProfileLocationLoaderCreator,
  ProfileReferencesLoaderCreator,
  ProfileTagsetsLoaderCreator,
  VisualLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IProfile } from './profile.interface';
import { Profile } from './profile.entity';

@Resolver(() => IProfile)
export class ProfileResolverFields {
  @UseGuards(GraphqlGuard)
  @ResolveField('visual', () => IVisual, {
    nullable: true,
    description: 'A particular type of visual for this Profile.',
  })
  @Profiling.api
  async visual(
    @Parent() profile: IProfile,
    @Args('type', { type: () => VisualType }) type: VisualType,
    @Loader(VisualLoaderCreator, { parentClassRef: Profile })
    loader: ILoader<IVisual[]>
  ): Promise<IVisual | undefined> {
    const visuals = await loader.load(profile.id);
    return visuals.find(x => x.name === type);
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
    @Loader(ProfileTagsetsLoaderCreator) loader: ILoader<ITagset[]>
  ): Promise<ITagset> {
    const tagsets = await loader.load(profile.id);
    const defaultTagset = tagsets.find(
      t => t.name === RestrictedTagsetNames.DEFAULT
    );
    if (!defaultTagset) {
      throw new EntityNotFoundException(
        `Unable to locate DEFAULT tagset for Profile:${profile.id}`,
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
}
