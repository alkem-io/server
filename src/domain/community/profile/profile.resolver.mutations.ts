import { IReference } from '@domain/common/reference';
import { ITagset } from '@domain/common/tagset';
import {
  CreateReferenceOnProfileInput,
  CreateTagsetOnProfileInput,
  IProfile,
  UpdateProfileInput,
  UploadProfileAvatarInput,
} from '@domain/community/profile';
import { Inject, UseGuards } from '@nestjs/common';
import { PubSub } from 'apollo-server-express';
import { Args, Mutation, Resolver, Subscription } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { ProfileService } from './profile.service';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationEngineService } from '@src/services/platform/authorization-engine/authorization-engine.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { ReferenceService } from '@domain/common/reference/reference.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { PUB_SUB } from '@services/platform/subscription/subscription.module';
import { USER_AVATAR_UPLOADED } from '@services/platform/subscription/subscription.events';

@Resolver()
export class ProfileResolverMutations {
  constructor(
    private tagsetService: TagsetService,
    private referenceService: ReferenceService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private authorizationEngine: AuthorizationEngineService,
    private profileService: ProfileService,
    @Inject(PUB_SUB)
    private readonly subscriptionHandler: PubSub
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ITagset, {
    description: 'Creates a new Tagset on the specified Profile',
  })
  @Profiling.api
  async createTagsetOnProfile(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('tagsetData') tagsetData: CreateTagsetOnProfileInput
  ): Promise<ITagset> {
    const profile = await this.profileService.getProfileOrFail(
      tagsetData.profileID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      profile.authorization,
      AuthorizationPrivilege.CREATE,
      `profile: ${profile.id}`
    );

    const tagset = await this.profileService.createTagset(tagsetData);
    tagset.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        tagset.authorization,
        profile.authorization
      );
    return await this.tagsetService.saveTagset(tagset);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IReference, {
    description: 'Creates a new Reference on the specified Profile.',
  })
  @Profiling.api
  async createReferenceOnProfile(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('referenceInput') referenceInput: CreateReferenceOnProfileInput
  ): Promise<IReference> {
    const profile = await this.profileService.getProfileOrFail(
      referenceInput.profileID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      profile.authorization,
      AuthorizationPrivilege.CREATE,
      `profile: ${profile.id}`
    );
    const reference = await this.profileService.createReference(referenceInput);
    reference.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        reference.authorization,
        profile.authorization
      );
    return await this.referenceService.saveReference(reference);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IProfile, {
    description: 'Updates the specified Profile.',
  })
  @Profiling.api
  async updateProfile(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('profileData') profileData: UpdateProfileInput
  ): Promise<IProfile> {
    const profile = await this.profileService.getProfileOrFail(profileData.ID);
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      profile.authorization,
      AuthorizationPrivilege.UPDATE,
      `profile: ${profile.id}`
    );
    return await this.profileService.updateProfile(profileData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IProfile, {
    description: 'Uploads and sets an avatar image for the specified Profile.',
  })
  async uploadAvatar(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('uploadData') uploadData: UploadProfileAvatarInput,
    @Args({ name: 'file', type: () => GraphQLUpload })
    { createReadStream, filename, mimetype }: FileUpload
  ): Promise<IProfile> {
    const profile = await this.profileService.getProfileOrFail(
      uploadData.profileID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      profile.authorization,
      AuthorizationPrivilege.UPDATE,
      `profile: ${profile.id}`
    );
    const readStream = createReadStream();
    const updatedProfile = await this.profileService.uploadAvatar(
      readStream,
      filename,
      mimetype,
      uploadData
    );
    this.subscriptionHandler.publish(USER_AVATAR_UPLOADED, {
      avatarUploaded: updatedProfile,
    });
    return updatedProfile;
  }

  @Subscription(() => IProfile)
  avatarUploaded() {
    return this.subscriptionHandler.asyncIterator(USER_AVATAR_UPLOADED);
  }
}
