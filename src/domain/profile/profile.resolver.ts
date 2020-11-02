import { UseGuards } from '@nestjs/common';
import { Mutation, Args } from '@nestjs/graphql';
import { Resolver } from '@nestjs/graphql';
import { Roles } from '../../utils/decorators/roles.decorator';
import { GqlAuthGuard } from '../../utils/authentication/graphql.guard';
import { ReferenceInput } from '../reference/reference.dto';
import { Reference } from '../reference/reference.entity';
import { IReference } from '../reference/reference.interface';
import { Tagset } from '../tagset/tagset.entity';
import { ITagset } from '../tagset/tagset.interface';
import { RestrictedGroupNames } from '../user-group/user-group.entity';
import { ProfileService } from './profile.service';
import { ProfileInput } from './profile.dto';

@Resolver()
export class ProfileResolver {
  constructor(private profileService: ProfileService) {}

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
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

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Reference, {
    description:
      'Creates a new reference with the specified name for the profile with given id',
  })
  async createReferenceOnProfile(
    @Args('profileID') profileID: number,
    @Args('referenceInput') referenceInput: ReferenceInput
  ): Promise<IReference> {
    const reference = await this.profileService.createReference(
      profileID,
      referenceInput
    );
    return reference;
  }

  @Roles(RestrictedGroupNames.Members, RestrictedGroupNames.CommunityAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description:
      'Updates the fields on the Profile, such as avatar location or description',
  })
  async updateProfile(
    @Args('ID') profileID: number,
    @Args('profileData') profileData: ProfileInput
  ): Promise<boolean> {
    return await this.profileService.updateProfile(profileID, profileData);
  }
}
