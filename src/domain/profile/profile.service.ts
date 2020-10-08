import { Injectable } from '@nestjs/common';
import { TagsetService } from '../tagset/tagset.service';
import { IProfile } from './profile.interface';

@Injectable()
export class ProfileService {
  /*constructor(private tagsetService: TagsetService) {}

  // Helper method to ensure all members are initialised properly.
  // Note: has to be a seprate call due to restrictions from ORM.
  async initialiseMembers(profile: IProfile): Promise<IProfile> {
    if (!profile.references) {
      profile.references = [];
    }

    if (!profile.tagsets) {
      profile.tagsets = [];
    }

    // Check that the mandatory tagsets for a user are created
    if (profile.restrictedTagsetNames) {
      this.tagsetService.createRestrictedTagsets(profile, profile.restrictedTagsetNames);
    }

    return profile;
  }*/
}
