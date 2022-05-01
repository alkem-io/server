import { Profiling } from '@common/decorators';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IProfile } from './profile.interface';
import { IVisual } from '@domain/common/visual/visual.interface';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { IReference } from '@domain/common/reference/reference.interface';
import { ProfileService } from './profile.service';
import { ITagset } from '@domain/common';
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
  async avatar(@Parent() profile: IProfile): Promise<IVisual> {
    return await this.profileService.getAvatar(profile);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('references', () => [IReference], {
    nullable: true,
    description: 'A list of URLs to relevant information.',
  })
  @Profiling.api
  async references(@Parent() profile: IProfile): Promise<IReference[]> {
    return await this.profileService.getReferences(profile);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('tagsets', () => [ITagset], {
    nullable: true,
    description: 'A list of named tagsets, each of which has a list of tags.',
  })
  @Profiling.api
  async tagsets(@Parent() profile: IProfile): Promise<ITagset[]> {
    return await this.profileService.getTagsets(profile);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('location', () => ILocation, {
    nullable: true,
    description: 'The location for this Profile.',
  })
  @Profiling.api
  async location(@Parent() profile: IProfile): Promise<ILocation> {
    return await this.profileService.getLocation(profile);
  }
}
