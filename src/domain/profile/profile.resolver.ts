import { Mutation, Args } from '@nestjs/graphql';
import { Resolver } from '@nestjs/graphql';
import { Roles } from 'src/utils/decorators/roles.decorator';
import { ReferenceInput } from '../reference/reference.dto';
import { Reference } from '../reference/reference.entity';
import { IReference } from '../reference/reference.interface';
import { Tagset } from '../tagset/tagset.entity';
import { ITagset } from '../tagset/tagset.interface';
import { RestrictedGroupNames } from '../user-group/user-group.entity';
import { ProfileService } from './profile.service';

@Resolver()
export class ProfileResolver {
  constructor(private profileService: ProfileService) {}

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
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
}
