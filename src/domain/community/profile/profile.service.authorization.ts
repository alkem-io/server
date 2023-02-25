import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IProfile, Profile } from '@domain/community/profile';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileService } from './profile.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';

@Injectable()
export class ProfileAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
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
        relations: [
          'references',
          'avatar',
          'tagsets',
          'authorization',
          'visuals',
        ],
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
        visual.authorization =
          this.authorizationPolicyService.inheritParentAuthorization(
            visual.authorization,
            profile.authorization
          );
      }
    }
    return await this.profileRepository.save(profile);
  }
}
