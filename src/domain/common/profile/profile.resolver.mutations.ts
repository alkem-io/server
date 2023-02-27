import { IReference } from '@domain/common/reference';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { ProfileService } from './profile.service';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication/agent-info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { ReferenceService } from '@domain/common/reference/reference.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CreateTagsetOnProfileInput, UpdateProfileInput } from './dto';
import { CreateReferenceOnProfileInput } from './dto/profile.dto.create.reference';

@Resolver()
export class ProfileResolverMutations {
  constructor(
    private tagsetService: TagsetService,
    private referenceService: ReferenceService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private profileService: ProfileService
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
      tagsetData.profileID,
      {
        relations: ['tagsets'],
      }
    );
    await this.authorizationService.grantAccessOrFail(
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
      referenceInput.profileID,
      {
        relations: ['references'],
      }
    );
    await this.authorizationService.grantAccessOrFail(
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
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      profile.authorization,
      AuthorizationPrivilege.UPDATE,
      `profile: ${profile.id}`
    );
    return await this.profileService.updateProfile(profileData);
  }
}
