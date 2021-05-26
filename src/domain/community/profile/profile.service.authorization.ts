import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IProfile, Profile } from '@domain/community/profile';

@Injectable()
export class ProfileAuthorizationService {
  constructor(
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>
  ) {}

  async applyAuthorizationRules(profile: IProfile): Promise<IProfile> {
    if (profile.references) {
      for (const reference of profile.references) {
        reference.authorizationRules = profile.authorizationRules;
      }
    }

    if (profile.tagsets) {
      for (const tagset of profile.tagsets) {
        tagset.authorizationRules = profile.authorizationRules;
      }
    }
    return await this.profileRepository.save(profile);
  }
}
