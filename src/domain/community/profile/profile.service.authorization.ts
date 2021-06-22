import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IProfile, Profile } from '@domain/community/profile';
import { AuthorizationDefinitionService } from '@domain/common/authorization-definition/authorization.definition.service';

@Injectable()
export class ProfileAuthorizationService {
  constructor(
    private authorizationDefinitionService: AuthorizationDefinitionService,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>
  ) {}

  async applyAuthorizationRules(profile: IProfile): Promise<IProfile> {
    if (profile.references) {
      for (const reference of profile.references) {
        reference.authorization = this.authorizationDefinitionService.inheritParentAuthorization(
          reference.authorization,
          profile.authorization
        );
      }
    }

    if (profile.tagsets) {
      for (const tagset of profile.tagsets) {
        tagset.authorization = this.authorizationDefinitionService.inheritParentAuthorization(
          tagset.authorization,
          profile.authorization
        );
      }
    }
    return await this.profileRepository.save(profile);
  }
}
