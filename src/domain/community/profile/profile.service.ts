import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Reference } from '@domain/common/reference/reference.entity';
import { IReference } from '@domain/common/reference/reference.interface';
import { ReferenceService } from '@domain/common/reference/reference.service';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { CreateReferenceInput } from '@domain/common/reference';
import {
  UpdateProfileInput,
  Profile,
  IProfile,
} from '@domain/community/profile';

import validator from 'validator';
import { CreateTagsetInput } from '@domain/common/tagset';

@Injectable()
export class ProfileService {
  constructor(
    private tagsetService: TagsetService,
    private referenceService: ReferenceService,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createProfile(): Promise<IProfile> {
    const profile = new Profile();
    await this.initialiseMembers(profile);
    await this.profileRepository.save(profile);
    this.logger.verbose?.(
      `Created new profile with id: ${profile.id}`,
      LogContext.COMMUNITY
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

  async removeProfile(profileID: number): Promise<IProfile> {
    // Note need to load it in with all contained entities so can remove fully
    const profile = await this.getProfileByIdOrFail(profileID);

    if (profile.tagsets) {
      for (const tagset of profile.tagsets) {
        await this.tagsetService.removeTagset(tagset.id);
      }
    }

    if (profile.references) {
      for (const reference of profile.references) {
        await this.referenceService.removeReference(reference.id);
      }
    }

    return await this.profileRepository.remove(profile as Profile);
  }

  async createTagset(
    profileID: number,
    tagsetData: CreateTagsetInput
  ): Promise<ITagset> {
    const profile = await this.getProfileByIdOrFail(profileID);

    const tagset = await this.tagsetService.addTagsetWithName(
      profile,
      tagsetData.name
    );
    await this.profileRepository.save(profile);

    return tagset;
  }

  async createReference(
    profileID: number,
    referenceInput: CreateReferenceInput
  ): Promise<IReference> {
    const profile = await this.getProfileByIdOrFail(profileID);

    if (!profile.references)
      throw new EntityNotInitializedException(
        'References not defined',
        LogContext.COMMUNITY
      );
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

  async updateProfile(profileData: UpdateProfileInput): Promise<boolean> {
    const profile = await this.getProfileOrFail(profileData.ID);

    if (profileData.avatar) {
      profile.avatar = profileData.avatar;
    }
    if (profileData.description) {
      profile.description = profileData.description;
    }

    // Iterate over the tagsets
    const tagsetsData = profileData.tagsetsData;
    if (tagsetsData) {
      for (const tagsetData of tagsetsData) {
        await this.tagsetService.updateTagset(profile, tagsetData);
      }
    }

    // Iterate over the references
    const referencesData = profileData.referencesData;
    if (referencesData) {
      for (const referenceData of referencesData) {
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

  async getProfileOrFail(profileID: string): Promise<IProfile> {
    if (validator.isNumeric(profileID)) {
      const idInt: number = parseInt(profileID);
      return await this.getProfileByIdOrFail(idInt);
    }
    throw new EntityNotFoundException(
      `Profile with id(${profileID}) not found!`,
      LogContext.COMMUNITY
    );
  }

  async getProfileByIdOrFail(profileID: number): Promise<IProfile> {
    const profile = await Profile.findOne({ id: profileID });
    if (!profile)
      throw new EntityNotFoundException(
        `Profile with id(${profileID}) not found!`,
        LogContext.COMMUNITY
      );
    return profile;
  }
}
