import { Injectable } from '@nestjs/common';
import { TagsetService } from '../tagset/tagset.service';
import { IProfile } from './profile.interface';

@Injectable()
export class ProfileService {
  constructor(private tagsetService: TagsetService) {}

  initialiseMembers(profile: IProfile): IProfile {
    if (!profile.references) {
      profile.references = [];
    }

    if (!profile.tagsets) {
      profile.tagsets = [];
    }

    // Check that the mandatory tagsets for a user are created
    if (profile.restrictedTagsetNames) {
      this.tagsetService.createRestrictedTagsets(
        profile,
        profile.restrictedTagsetNames
      );
    }

    return profile;
  }
}
