import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IProfile, Profile } from '@domain/community/profile';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';

@Injectable()
export class ProfileAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>
  ) {}

  async applyAuthorizationPolicy(profile: IProfile): Promise<IProfile> {
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
    if (profile.avatar) {
      profile.avatar.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          profile.avatar.authorization,
          profile.authorization
        );
    }
    return await this.profileRepository.save(profile);
  }
}
