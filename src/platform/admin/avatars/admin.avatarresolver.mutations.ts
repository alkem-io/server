import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ContributorService } from '@domain/community/contributor/contributor.service';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { ProfileService } from '@domain/common/profile/profile.service';
import { StorageBucketAuthorizationService } from '@domain/storage/storage-bucket/storage.bucket.service.authorization';
import { RelationshipNotFoundException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IProfile } from '@domain/common/profile/profile.interface';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class AdminSearchContributorsMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private contributorService: ContributorService,
    private profileService: ProfileService,
    private storageBucketAuthorizationService: StorageBucketAuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IProfile, {
    description:
      'Update the Avatar on the Profile with the spedified profileID to be stored as a Document.',
  })
  async adminUpdateContributorAvatars(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('profileID', { type: () => UUID }) profileID: string
  ): Promise<IProfile> {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `Update contributor avatars to be stored as Documents: ${agentInfo.email}`
    );

    let profile =
      await this.contributorService.ensureAvatarIsStoredInLocalStorageBucket(
        profileID,
        agentInfo.userID
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
