import { Mutation, Args } from '@nestjs/graphql';
import { Resolver } from '@nestjs/graphql';
import { Tagset } from '../tagset/tagset.entity';
import { ITagset } from '../tagset/tagset.interface';
import { ProfileService } from './profile.service';

@Resolver()
export class ProfileResolver {
  constructor(private profileService: ProfileService) {}

  @Mutation(() => Tagset, {
    description:
      'Creates a new tagset with the specified name for the profile with given id',
  })
  async createTagsetOnProfile(
    @Args('profileID') profileID: number,
    @Args('tagsetName') tagsetName: string
  ): Promise<ITagset> {
    const tagset = await this.profileService.createTagset(
      profileID,
      tagsetName
    );
    return tagset;
  }
}
