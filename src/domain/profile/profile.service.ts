import { Injectable } from '@nestjs/common';
import { ITagset } from '../tagset/tagset.interface';
import { TagsetService } from '../tagset/tagset.service';
import { Profile } from './profile.entity';
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

  async createTagset(profileID: number, tagsetName: string): Promise<ITagset> {
    const profile = (await this.getProfile(profileID)) as Profile;

    if (!profile) throw new Error(`Profile with id(${profileID}) not found!`);

    const tagset = this.tagsetService.addTagsetWithName(profile, tagsetName);
    await profile.save();

    return tagset;
  }

  async getProfile(profileID: number): Promise<IProfile | undefined> {
    return Profile.findOne({ id: profileID });
  }
}
