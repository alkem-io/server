import { Profiling } from '@common/decorators';
import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IProfile } from './profile.interface';
import { IVisual } from '@domain/common/visual/visual.interface';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { IReference } from '@domain/common/reference/reference.interface';
import { ProfileService } from './profile.service';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { ILocation } from '@domain/common/location/location.interface';

@Resolver(() => IProfile)
export class ProfileResolverFields {
  constructor(private profileService: ProfileService) {}

  @UseGuards(GraphqlGuard)
  @ResolveField('avatar', () => IVisual, {
    nullable: true,
    description: 'The Visual avatar for this Profile.',
  })
  @Profiling.api
  async avatar(
    @Parent() profile: IProfile,
    @Context() { loaders }: IGraphQLContext
  ): Promise<IVisual> {
    return loaders.avatarsLoader.load(profile.id);
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
