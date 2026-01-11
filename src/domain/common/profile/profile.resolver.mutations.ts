import { IReference } from '@domain/common/reference';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentActor, Profiling } from '@src/common/decorators';
import { ProfileService } from './profile.service';
import { ActorContext } from '@core/actor-context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { ReferenceService } from '@domain/common/reference/reference.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CreateTagsetOnProfileInput } from './dto';
import { CreateReferenceOnProfileInput } from './dto/profile.dto.create.reference';
import { IProfile } from './profile.interface';
import { UpdateProfileDirectInput } from './dto/profile.dto.update.direct';
import { TagsetType } from '@common/enums/tagset.type';
import { NotSupportedException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class ProfileResolverMutations {
  constructor(
    private tagsetService: TagsetService,
    private referenceService: ReferenceService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private profileService: ProfileService
  ) {}

  @Mutation(() => ITagset, {
    description: 'Creates a new Tagset on the specified Profile',
  })
  @Profiling.api
  async createTagsetOnProfile(
    @CurrentActor() actorContext: ActorContext,
    @Args('tagsetData') tagsetData: CreateTagsetOnProfileInput
  ): Promise<ITagset> {
    const profile = await this.profileService.getProfileOrFail(
      tagsetData.profileID
    );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      profile.authorization,
      AuthorizationPrivilege.CREATE,
      `profile: ${profile.id}`
    );

    // do not for now allow api access for creating non-freeform tagsets
    if (tagsetData.type && tagsetData.type !== TagsetType.FREEFORM) {
      throw new NotSupportedException(
        `Creating of Tagsets not of type FREEFORM not yet supported: ${JSON.stringify(
          tagsetData
        )}`,
        LogContext.PROFILE
      );
    }

    const tagset = await this.profileService.addOrUpdateTagsetOnProfile(
      profile,
      tagsetData
    );
    tagset.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        tagset.authorization,
        profile.authorization
      );
    return await this.tagsetService.save(tagset);
  }

  @Mutation(() => IReference, {
    description: 'Creates a new Reference on the specified Profile.',
  })
  @Profiling.api
  async createReferenceOnProfile(
    @CurrentActor() actorContext: ActorContext,
    @Args('referenceInput') referenceInput: CreateReferenceOnProfileInput
  ): Promise<IReference> {
    const profile = await this.profileService.getProfileOrFail(
      referenceInput.profileID,
      {
        relations: { references: true },
      }
    );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      profile.authorization,
      AuthorizationPrivilege.CREATE,
      `profile: ${profile.id}`
    );
    const reference = await this.profileService.createReference(referenceInput);
    reference.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        reference.authorization,
        profile.authorization
      );
    return await this.referenceService.saveReference(reference);
  }

  @Mutation(() => IProfile, {
    description: 'Updates the specified Profile.',
  })
  @Profiling.api
  async updateProfile(
    @CurrentActor() actorContext: ActorContext,
    @Args('profileData') profileData: UpdateProfileDirectInput
  ): Promise<IProfile> {
    const profile = await this.profileService.getProfileOrFail(
      profileData.profileID
    );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      profile.authorization,
      AuthorizationPrivilege.UPDATE,
      `profile: ${profile.id}`
    );
    return await this.profileService.updateProfile(profile, profileData);
  }
}
