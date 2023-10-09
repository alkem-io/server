import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IProfile, Profile } from '@domain/common/profile';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileService } from './profile.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { VisualAuthorizationService } from '../visual/visual.service.authorization';
import { StorageBucketAuthorizationService } from '@domain/storage/storage-bucket/storage.bucket.service.authorization';

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
          storageBucket: true,
        },
      }
    );

    // Inherit from the parent
    profile.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        profile.authorization,
        parentAuthorization
      );

    if (profile.references) {
      for (const reference of profile.references) {
        reference.authorization =
          this.authorizationPolicyService.inheritParentAuthorization(
            reference.authorization,
            profile.authorization
          );
      }
    }

    if (profile.tagsets) {
      for (const tagset of profile.tagsets) {
        tagset.authorization =
          this.authorizationPolicyService.inheritParentAuthorization(
            tagset.authorization,
            profile.authorization
          );
      }
    }
    if (profile.visuals) {
      for (const visual of profile.visuals) {
        const visualWithAuth =
          await this.visualAuthorizationService.applyAuthorizationPolicy(
            visual,
            profile.authorization
          );
        visual.authorization = visualWithAuth.authorization;
      }
    }

    if (profile.storageBucket) {
      profile.storageBucket =
        await this.storageBucketAuthorizationService.applyAuthorizationPolicy(
          profile.storageBucket,
          profile.authorization
        );
    }
    return await this.profileRepository.save(profile);
  }
}
