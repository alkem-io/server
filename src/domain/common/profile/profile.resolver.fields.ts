import { Profiling } from '@common/decorators';
import { Args, Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IVisual } from '@domain/common/visual/visual.interface';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { IReference } from '@domain/common/reference/reference.interface';
import { ProfileService } from './profile.service';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { ILocation } from '@domain/common/location/location.interface';
import { VisualType } from '@common/enums/visual.type';
import { RestrictedTagsetNames } from '../tagset/tagset.entity';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { IProfile } from './profile.interface';

@Resolver(() => IProfile)
export class ProfileResolverFields {
  constructor(private profileService: ProfileService) {}

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
    const result = await this.profileService.getVisual(profile, type);
    return result;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('references', () => [IReference], {
    nullable: true,
    description: 'A list of URLs to relevant information.',
  })
  @Profiling.api
  async references(
    @Parent() profile: IProfile,
    @Context() { loaders }: IGraphQLContext
  ): Promise<IReference[]> {
    return loaders.referencesLoader.load(profile.id);
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
    @Context() { loaders }: IGraphQLContext
  ): Promise<ITagset> {
    const tagsets = await loaders.tagsetsLoader.load(profile.id);
    const defaultTagset = tagsets.find(
      t => t.name === RestrictedTagsetNames.DEFAULT
    );
    if (!defaultTagset) {
      throw new EntityNotFoundException(
        `Unable to locate DEFAULT tagset: ${profile.id}`,
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
    @Context() { loaders }: IGraphQLContext
  ): Promise<ITagset[]> {
    return loaders.tagsetsLoader.load(profile.id);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('visuals', () => [IVisual], {
    nullable: false,
    description: 'A list of visuals for this Profile.',
  })
  @Profiling.api
  async visuals(@Parent() profile: IProfile): Promise<IVisual[]> {
    return await this.profileService.getVisuals(profile);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('location', () => ILocation, {
    nullable: true,
    description: 'The location for this Profile.',
  })
  @Profiling.api
  async location(
    @Parent() profile: IProfile,
    @Context() { loaders }: IGraphQLContext
  ): Promise<ILocation> {
    return loaders.locationsLoader.load(profile.id);
  }
}
