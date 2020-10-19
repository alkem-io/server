import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReferenceInput } from '../reference/reference.dto';
import { Reference } from '../reference/reference.entity';
import { IReference } from '../reference/reference.interface';
import { ReferenceService } from '../reference/reference.service';
import { ITagset } from '../tagset/tagset.interface';
import { TagsetService } from '../tagset/tagset.service';
import { Profile } from './profile.entity';
import { IProfile } from './profile.interface';

@Injectable()
export class ProfileService {
  constructor(
    private tagsetService: TagsetService,
    private referenceService: ReferenceService,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>
  ) {}

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
    await this.profileRepository.save(profile);

    return tagset;
  }

  async createReference(
    profileID: number,
    referenceInput: ReferenceInput
  ): Promise<IReference> {
    const profile = (await this.getProfile(profileID)) as Profile;

    if (!profile) throw new Error(`Profile with id(${profileID}) not found!`);

    const newReference = this.referenceService.createReference(referenceInput);
    if (!profile.references) throw new Error('References not defined');
    // check there is not already a reference with the same name
    for (const reference of profile.references) {
      if (reference.name === newReference.name) {
        return reference;
      }
    }
    // If get here then no ref with the same name
    await profile.references.push(newReference as Reference);
    await this.profileRepository.save(profile);

    return newReference;
  }

  async getProfile(profileID: number): Promise<IProfile | undefined> {
    return Profile.findOne({ id: profileID });
  }
}
