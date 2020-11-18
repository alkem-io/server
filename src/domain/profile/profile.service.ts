import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { LogContexts } from '../../utils/logging/logging.contexts';
import { ReferenceInput } from '../reference/reference.dto';
import { Reference } from '../reference/reference.entity';
import { IReference } from '../reference/reference.interface';
import { ReferenceService } from '../reference/reference.service';
import { ITagset } from '../tagset/tagset.interface';
import { TagsetService } from '../tagset/tagset.service';
import { ProfileInput } from './profile.dto';
import { Profile } from './profile.entity';
import { IProfile } from './profile.interface';

@Injectable()
export class ProfileService {
  constructor(
    private tagsetService: TagsetService,
    private referenceService: ReferenceService,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger
  ) {}

  async createProfile(): Promise<IProfile> {
    const profile = new Profile();
    await this.initialiseMembers(profile);
    await this.profileRepository.save(profile);
    this.logger.verbose(
      `Created new profile with id: ${profile.id}`,
      LogContexts.COMMUNITY
    );
    return profile;
  }

  async initialiseMembers(profile: IProfile): Promise<IProfile> {
    if (!profile.references) {
      profile.references = [];
    }

    if (!profile.tagsets) {
      profile.tagsets = [];
    }

    // Check that the mandatory tagsets for a user are created
    if (profile.restrictedTagsetNames) {
      await this.tagsetService.createRestrictedTagsets(
        profile,
        profile.restrictedTagsetNames
      );
    }

    return profile;
  }

  async createTagset(profileID: number, tagsetName: string): Promise<ITagset> {
    const profile = (await this.getProfile(profileID)) as Profile;

    if (!profile) throw new Error(`Profile with id(${profileID}) not found!`);

    const tagset = await this.tagsetService.addTagsetWithName(
      profile,
      tagsetName
    );
    await this.profileRepository.save(profile);

    return tagset;
  }

  async createReference(
    profileID: number,
    referenceInput: ReferenceInput
  ): Promise<IReference> {
    const profile = (await this.getProfile(profileID)) as Profile;

    if (!profile) throw new Error(`Profile with id(${profileID}) not found!`);

    if (!profile.references) throw new Error('References not defined');
    // check there is not already a reference with the same name
    for (const reference of profile.references) {
      if (reference.name === referenceInput.name) {
        return reference;
      }
    }
    // If get here then no ref with the same name
    const newReference = await this.referenceService.createReference(
      referenceInput
    );

    await profile.references.push(newReference as Reference);
    await this.profileRepository.save(profile);

    return newReference;
  }

  async updateProfile(
    profileID: number,
    profileData: ProfileInput
  ): Promise<boolean> {
    const profile = (await this.getProfile(profileID)) as Profile;
    if (!profile) throw new Error(`Profile with id (${profileID}) not found!`);

    profile.avatar = profileData.avatar;
    profile.description = profileData.description;

    // Iterate over the tagsets
    const tagsetsData = profileData.tagsetsData;
    if (tagsetsData) {
      for (let i = 0; i < tagsetsData.length; i++) {
        const tagsetData = tagsetsData[i];
        await this.tagsetService.updateOrCreateTagset(profile, tagsetData);
      }
    }

    // Iterate over the references
    const referencesData = profileData.referencesData;
    if (referencesData) {
      for (let i = 0; i < referencesData.length; i++) {
        const referenceData = referencesData[i];
        const existingReference = profile.references?.find(
          reference => reference.name === referenceData.name
        );
        if (existingReference) {
          await this.referenceService.updateReference(
            existingReference,
            referenceData
          );
        } else {
          const newReference = await this.referenceService.createReference(
            referenceData
          );
          profile.references?.push(newReference as Reference);
        }
      }
    }
    await this.profileRepository.save(profile);
    return true;
  }

  async getProfile(profileID: number): Promise<IProfile | undefined> {
    return await Profile.findOne({ id: profileID });
  }
}
