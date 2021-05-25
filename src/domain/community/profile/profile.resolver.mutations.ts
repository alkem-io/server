import { IReference, CreateReferenceInput } from '@domain/common/reference';
import { ITagset, CreateTagsetInput } from '@domain/common/tagset';
import {
  IProfile,
  UpdateProfileInput,
  UploadProfileAvatarInput,
} from '@domain/community/profile';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { ProfileService } from './profile.service';
import {
  GraphqlGuard,
  AuthorizationGlobalRoles,
  AuthorizationSelfManagement,
} from '@core/authorization';
import { AuthorizationRoleGlobal } from '@common/enums';
import { UserInfo } from '@core/authentication';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

@Resolver()
export class ProfileResolverMutations {
  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private profileService: ProfileService
  ) {}

  // @AuthorizationGlobalRoles(
  //   AuthorizationRoleGlobal.CommunityAdmin,
  //   AuthorizationRoleGlobal.Admin
  // )
  // @AuthorizationSelfManagement()
  @UseGuards(GraphqlGuard)
  @Mutation(() => ITagset, {
    description: 'Creates a new Tagset on the specified Profile',
  })
  @Profiling.api
  async createTagsetOnProfile(
    @CurrentUser() userInfo: UserInfo,
    @Args('tagsetData') tagsetData: CreateTagsetInput
  ): Promise<ITagset> {
    if (!tagsetData.parentID) tagsetData.parentID = '';
    const profile = await this.profileService.getProfileOrFail(
      tagsetData.parentID
    );
    await this.authorizationEngine.grantAccessOrFail(
      userInfo.credentials,
      profile.authorizationRules,
      AuthorizationPrivilege.UPDATE,
      `profile: ${profile.id}`
    );

    return await this.profileService.createTagset(tagsetData);
  }

  @AuthorizationGlobalRoles(
    AuthorizationRoleGlobal.CommunityAdmin,
    AuthorizationRoleGlobal.Admin
  )
  @AuthorizationSelfManagement()
  @UseGuards(GraphqlGuard)
  @Mutation(() => IReference, {
    description: 'Creates a new Reference on the specified Profile.',
  })
  @Profiling.api
  async createReferenceOnProfile(
    @Args('referenceInput') referenceInput: CreateReferenceInput
  ): Promise<IReference> {
    return await this.profileService.createReference(referenceInput);
  }

  @AuthorizationGlobalRoles(
    AuthorizationRoleGlobal.Admin,
    AuthorizationRoleGlobal.CommunityAdmin
  )
  @AuthorizationSelfManagement()
  @UseGuards(GraphqlGuard)
  @Mutation(() => IProfile, {
    description: 'Updates the specified Profile.',
  })
  @Profiling.api
  async updateProfile(
    @Args('profileData') profileData: UpdateProfileInput
  ): Promise<IProfile> {
    return await this.profileService.updateProfile(profileData);
  }

  @AuthorizationGlobalRoles(
    AuthorizationRoleGlobal.Admin,
    AuthorizationRoleGlobal.CommunityAdmin
  )
  @AuthorizationSelfManagement()
  @Mutation(() => IProfile, {
    description: 'Uploads and sets an avatar image for the specified Profile.',
  })
  async uploadAvatar(
    @Args('uploadData') uploadData: UploadProfileAvatarInput,
    @Args({ name: 'file', type: () => GraphQLUpload })
    { createReadStream, filename, mimetype }: FileUpload
  ): Promise<IProfile> {
    const readStream = createReadStream();
    return await this.profileService.uploadAvatar(
      readStream,
      filename,
      mimetype,
      uploadData
    );
  }
}
