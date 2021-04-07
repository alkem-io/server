import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
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
import { CreateProfileInput } from './profile.dto.create';

@Injectable()
export class ProfileService {
  constructor(
    private tagsetService: TagsetService,
    private referenceService: ReferenceService,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createProfile(profileData?: CreateProfileInput): Promise<IProfile> {
    let profile = new Profile();
    if (profileData) {
      profile = Profile.create(profileData);
    }
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
        await this.tagsetService.removeTagset({ ID: tagset.id });
      }
    }

    if (profile.references) {
      for (const reference of profile.references) {
        await this.referenceService.removeReference({ ID: reference.id });
      }
    }

    return await this.profileRepository.remove(profile as Profile);
  }

  async createTagset(tagsetData: CreateTagsetInput): Promise<ITagset> {
    const profileID = tagsetData.parentID;
    const profile = await this.getProfileByIdOrFail(profileID);

    const tagset = await this.tagsetService.addTagsetWithName(
      profile,
      tagsetData.name
    );
    await this.profileRepository.save(profile);

    return tagset;
  }

  async createReference(
    referenceInput: CreateReferenceInput
  ): Promise<IReference> {
    const profileID = referenceInput.parentID;
    if (!profileID)
      throw new ValidationException(
        'No parendId specified for reference creation',
        LogContext.COMMUNITY
      );
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

  async updateProfile(profileData: UpdateProfileInput): Promise<IProfile> {
    const profile = await this.getProfileOrFail(profileData.ID);

    if (profileData.avatar) {
      profile.avatar = profileData.avatar;
    }
    if (profileData.description) {
      profile.description = profileData.description;
    }

    // Iterate over the tagsets
    const tagsetsData = profileData.updateTagsetsData;
    if (tagsetsData) {
      for (const tagsetData of tagsetsData) {
        await this.tagsetService.updateTagset(tagsetData);
      }
    }

    // Iterate over the references
    const updateReferencesData = profileData.updateReferencesData;
    if (updateReferencesData) {
      for (const referenceData of updateReferencesData) {
        await this.referenceService.updateReference(referenceData);
      }
    }
    const createReferencesData = profileData.createReferencesData;
    if (createReferencesData) {
      for (const referenceData of createReferencesData) {
        const reference = await this.referenceService.createReference(
          referenceData
        );
        profile.references?.push(reference as Reference);
      }
    }

    return await this.profileRepository.save(profile);
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
