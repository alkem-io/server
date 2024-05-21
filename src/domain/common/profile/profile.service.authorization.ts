import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IProfile, Profile } from '@domain/common/profile';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileService } from './profile.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { VisualAuthorizationService } from '../visual/visual.service.authorization';
import { StorageBucketAuthorizationService } from '@domain/storage/storage-bucket/storage.bucket.service.authorization';
import { LogContext } from '@common/enums/logging.context';
import { RelationshipNotFoundException } from '@common/exceptions';
import { Profiling } from '@common/decorators';

@Injectable()
export class ProfileAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private visualAuthorizationService: VisualAuthorizationService,
    private storageBucketAuthorizationService: StorageBucketAuthorizationService,
    private profileService: ProfileService,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>
  ) {}

  @Profiling.api
  async applyAuthorizationPolicy(
    profileInput: IProfile,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IProfile> {
    const profile = await this.profileService.getProfileOrFail(
      profileInput.id,
      {
        relations: {
          references: true,
          tagsets: true,
          authorization: true,
          visuals: true,
          storageBucket: {
            documents: {
              tagset: true,
            },
          },
        },
      }
    );
    if (
      !profile.references ||
      !profile.tagsets ||
      !profile.authorization ||
      !profile.visuals ||
      !profile.storageBucket
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load Profile with entities at start of auth reset: ${profileInput.id} `,
        LogContext.ACCOUNT
      );
    }

    // Inherit from the parent
    profile.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        profile.authorization,
        parentAuthorization
      );

    for (const reference of profile.references) {
      reference.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          reference.authorization,
          profile.authorization
        );
    }

    for (const tagset of profile.tagsets) {
      tagset.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          tagset.authorization,
          profile.authorization
        );
    }

    for (const visual of profile.visuals) {
      this.visualAuthorizationService.applyAuthorizationPolicy(
        visual,
        profile.authorization
      );
    }

    profile.storageBucket =
      this.storageBucketAuthorizationService.applyAuthorizationPolicy(
        profile.storageBucket,
        profile.authorization
      );

    return profile;
  }
}
