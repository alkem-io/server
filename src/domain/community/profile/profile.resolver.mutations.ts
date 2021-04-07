import { Roles } from '@common/decorators/roles.decorator';
import { Reference } from '@domain/common/reference/reference.entity';
import { IReference } from '@domain/common/reference/reference.interface';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { CreateReferenceInput } from '@domain/common/reference';
import {
  IProfile,
  Profile,
  UpdateProfileInput,
} from '@domain/community/profile';
import { CreateTagsetInput } from '@domain/common/tagset';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Profiling, SelfManagement } from '@src/common/decorators';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { ProfileService } from './profile.service';

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
  @Mutation(() => Profile, {
    description:
      'Updates the fields on the Profile, such as avatar location or description',
  })
  @Profiling.api
  async updateProfile(
    @Args('profileData') profileData: UpdateProfileInput
  ): Promise<IProfile> {
    return await this.profileService.updateProfile(profileData);
  }

  @Roles(AuthorizationRoles.EcoverseAdmins, AuthorizationRoles.CommunityAdmins)
  @SelfManagement()
  @Mutation(() => Profile)
  async uploadAvatar(
    @Args('profileID') profileID: number,
    @Args({ name: 'file', type: () => GraphQLUpload })
    { createReadStream, filename, mimetype }: FileUpload
  ): Promise<IProfile> {
    const readStream = createReadStream();
    return await this.profileService.uploadAvatar(
      readStream,
      filename,
      mimetype,
      profileID
    );
  }
}
