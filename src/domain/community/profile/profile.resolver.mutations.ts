import { UseGuards } from '@nestjs/common';
import { Mutation, Args } from '@nestjs/graphql';
import { Resolver } from '@nestjs/graphql';
import { Roles } from '@common/decorators/roles.decorator';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Reference } from '@domain/common/reference/reference.entity';
import { IReference } from '@domain/common/reference/reference.interface';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { ProfileService } from './profile.service';
import { Profiling } from '@src/common/decorators';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { CreateReferenceInput } from '@domain/common/reference';
import { UpdateProfileInput } from '@domain/community/profile';
import { CreateTagsetInput } from '@domain/common/tagset';

@Resolver()
export class ProfileResolverMutations {
  constructor(private profileService: ProfileService) {}

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Tagset, {
    description:
      'Creates a new tagset with the specified name for the profile with given id',
  })
  @Profiling.api
  async createTagsetOnProfile(
    @Args('tagsetData') tagsetData: CreateTagsetInput
  ): Promise<ITagset> {
    return await this.profileService.createTagset(tagsetData);
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Reference, {
    description:
      'Creates a new reference with the specified name for the profile with given id',
  })
  @Profiling.api
  async createReferenceOnProfile(
    @Args('referenceInput') referenceInput: CreateReferenceInput
  ): Promise<IReference> {
    return await this.profileService.createReference(referenceInput);
  }

  @Roles(AuthorizationRoles.EcoverseAdmins, AuthorizationRoles.CommunityAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description:
      'Updates the fields on the Profile, such as avatar location or description',
  })
  @Profiling.api
  async updateProfile(
    @Args('profileData') profileData: UpdateProfileInput
  ): Promise<boolean> {
    return await this.profileService.updateProfile(profileData);
  }
}
