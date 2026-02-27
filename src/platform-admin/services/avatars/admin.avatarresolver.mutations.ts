import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { RelationshipNotFoundException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAvatarService } from '@domain/common/profile/profile.avatar.service';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { StorageBucketAuthorizationService } from '@domain/storage/storage-bucket/storage.bucket.service.authorization';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@InstrumentResolver()
@Resolver()
export class AdminSearchContributorsMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private profileAvatarService: ProfileAvatarService,
    private profileService: ProfileService,
    private storageBucketAuthorizationService: StorageBucketAuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService
  ) {}

  @Mutation(() => IProfile, {
    description:
      'Update the Avatar on the Profile with the spedified profileID to be stored as a Document.',
  })
  async adminUpdateContributorAvatars(
    @CurrentActor() actorContext: ActorContext,
    @Args('profileID', { type: () => UUID }) profileID: string
  ): Promise<IProfile> {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      actorContext,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `Update contributor avatars to be stored as Documents: ${actorContext.actorID}`
    );

    let profile =
      await this.profileAvatarService.ensureAvatarIsStoredInLocalStorageBucket(
        profileID,
        actorContext.actorID
      );
    profile = await this.profileService.getProfileOrFail(profile.id, {
      relations: {
        storageBucket: {
          documents: {
            tagset: {
              authorization: true,
            },
          },
        },
        authorization: true,
      },
    });

    if (!profile.storageBucket) {
      throw new RelationshipNotFoundException(
        `Unable to find StorageBucket for Profile ${profile.id}`,
        LogContext.PROFILE
      );
    }

    if (!profile.authorization) {
      throw new RelationshipNotFoundException(
        `Profile ${profile.id} does not have authorization information.`,
        LogContext.PROFILE
      );
    }

    const authorizations =
      await this.storageBucketAuthorizationService.applyAuthorizationPolicy(
        profile.storageBucket,
        profile.authorization
      );
    await this.authorizationPolicyService.saveAll(authorizations);

    return await this.profileService.getProfileOrFail(profile.id);
  }
}
