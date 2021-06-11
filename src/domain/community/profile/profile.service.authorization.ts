import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IProfile, Profile } from '@domain/community/profile';
import { AuthorizationEngineService } from '@src/services/platform/authorization-engine/authorization-engine.service';

@Injectable()
export class ProfileAuthorizationService {
  constructor(
    private authorizationEngine: AuthorizationEngineService,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>
  ) {}

  async applyAuthorizationRules(profile: IProfile): Promise<IProfile> {
    if (profile.references) {
      for (const reference of profile.references) {
        reference.authorization = this.authorizationEngine.inheritParentAuthorization(
          reference.authorization,
          profile.authorization
        );
      }
    }

    if (profile.tagsets) {
      for (const tagset of profile.tagsets) {
        tagset.authorization = this.authorizationEngine.inheritParentAuthorization(
          tagset.authorization,
          profile.authorization
        );
      }
    }
    return await this.profileRepository.save(profile);
  }
}
