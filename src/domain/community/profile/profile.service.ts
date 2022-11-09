import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Reference, IReference } from '@domain/common/reference';
import { ReferenceService } from '@domain/common/reference/reference.service';
import { ITagset } from '@domain/common/tagset';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { Profile, IProfile } from '@domain/community/profile';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { VisualService } from '@domain/common/visual/visual.service';
import { IVisual } from '@domain/common/visual';
import {
  CreateProfileInput,
  CreateTagsetOnProfileInput,
  UpdateProfileInput,
} from './dto';
import { CreateReferenceOnProfileInput } from './dto/profile.dto.create.reference';
import { ILocation, LocationService } from '@domain/common/location';

@Injectable()
export class ProfileService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private tagsetService: TagsetService,
    private referenceService: ReferenceService,
    private visualService: VisualService,
    private locationService: LocationService,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createProfile(profileData?: CreateProfileInput): Promise<IProfile> {
    const profile: IProfile = Profile.create({
      description: profileData?.description,
    });
    profile.authorization = new AuthorizationPolicy();
    profile.avatar = await this.visualService.createVisualAvatar();
    if (profileData?.avatarURL) {
      profile.avatar.uri = profileData.avatarURL;
    }
    profile.location = await this.locationService.createLocation(
      profileData?.location
    );

    profile.references = [];
    if (profileData?.referencesData) {
      for (const referenceData of profileData.referencesData) {
        const reference = await this.referenceService.createReference(
          referenceData
        );
        profile.references.push(reference);
      }
    }

    profile.tagsets = [];
    if (profileData?.tagsetsData) {
      for (const tagsetData of profileData.tagsetsData) {
        const tagset = await this.tagsetService.createTagset(tagsetData);
        profile.tagsets.push(tagset);
      }
    }

    await this.profileRepository.save(profile);
    this.logger.verbose?.(
      `Created new profile with id: ${profile.id}`,
      LogContext.COMMUNITY
    );
    return profile;
  }

  async updateProfile(profileData: UpdateProfileInput): Promise<IProfile> {
    const profile = await this.getProfileOrFail(profileData.ID, {
      relations: [
        'references',
        'avatar',
        'tagsets',
        'authorization',
        'location',
      ],
    });

    if (profileData.description) {
      profile.description = profileData.description;
    }

    if (profileData.references) {
      profile.references = this.referenceService.updateReferences(
        profile.references,
        profileData.references
      );
    }

    if (profileData.tagsets) {
      profile.tagsets = this.tagsetService.updateTagsets(
        profile.tagsets,
        profileData.tagsets
      );
    }

    if (profileData.location) {
      this.locationService.updateLocationValues(
        profile.location,
        profileData.location
      );
    }

    return await this.profileRepository.save(profile);
  }

  async deleteProfile(profileID: string): Promise<IProfile> {
    // Note need to load it in with all contained entities so can remove fully
    const profile = await this.getProfileOrFail(profileID, {
      relations: [
        'references',
        'avatar',
        'location',
        'tagsets',
        'authorization',
      ],
    });

    if (profile.tagsets) {
      for (const tagset of profile.tagsets) {
        await this.tagsetService.removeTagset({ ID: tagset.id });
      }
    }

    if (profile.references) {
      for (const reference of profile.references) {
        await this.referenceService.deleteReference({
          ID: reference.id,
        });
      }
    }

    if (profile.avatar) {
      await this.visualService.deleteVisual({ ID: profile.avatar.id });
    }

    if (profile.location) {
      await this.locationService.removeLocation(profile.location);
    }

    if (profile.authorization)
      await this.authorizationPolicyService.delete(profile.authorization);

    return await this.profileRepository.remove(profile as Profile);
  }

  async createTagset(tagsetData: CreateTagsetOnProfileInput): Promise<ITagset> {
    const profile = await this.getProfileOrFail(tagsetData.profileID, {
      relations: ['tagsets'],
    });

    const tagset = await this.tagsetService.addTagsetWithName(
      profile,
      tagsetData
    );

    await this.profileRepository.save(profile);

    return tagset;
  }

  async createReference(
    referenceInput: CreateReferenceOnProfileInput
  ): Promise<IReference> {
    const profile = await this.getProfileOrFail(referenceInput.profileID, {
      relations: ['references'],
    });

    if (!profile.references)
      throw new EntityNotInitializedException(
        'References not defined',
        LogContext.COMMUNITY
      );
    // check there is not already a reference with the same name
    for (const reference of profile.references) {
      if (reference.name === referenceInput.name) {
        throw new ValidationException(
          `Reference with the provided name already exists: ${referenceInput.name}`,
          LogContext.CONTEXT
        );
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

  async getProfileOrFail(
    profileID: string,
    options?: FindOneOptions<Profile>
  ): Promise<IProfile> {
    const profile = await Profile.findOne({ id: profileID }, options);
    if (!profile)
      throw new EntityNotFoundException(
        `Profile with id(${profileID}) not found!`,
        LogContext.COMMUNITY
      );
    return profile;
  }

  generateRandomAvatar(firstName: string, lastName: string): string {
    const randomColor = Math.floor(Math.random() * 16777215).toString(16);
    return `https://eu.ui-avatars.com/api/?name=${firstName}+${lastName}&background=${randomColor}&color=ffffff`;
  }

  async getAvatar(profileInput: IProfile): Promise<IVisual> {
    const profile = await this.getProfileOrFail(profileInput.id, {
      relations: ['avatar'],
    });
    if (!profile.avatar) {
      throw new EntityNotInitializedException(
        `Profile not initialized: ${profile.id}`,
        LogContext.COMMUNITY
      );
    }
    return profile.avatar;
  }

  async getReferences(profileInput: IProfile): Promise<IReference[]> {
    const profile = await this.getProfileOrFail(profileInput.id, {
      relations: ['references'],
    });
    if (!profile.references) {
      throw new EntityNotInitializedException(
        `Profile not initialized: ${profile.id}`,
        LogContext.COMMUNITY
      );
    }
    return profile.references;
  }

  async getTagsets(profileInput: IProfile): Promise<ITagset[]> {
    const profile = await this.getProfileOrFail(profileInput.id, {
      relations: ['tagsets'],
    });
    if (!profile.tagsets) {
      throw new EntityNotInitializedException(
        `Profile not initialized: ${profile.id}`,
        LogContext.COMMUNITY
      );
    }
    return profile.tagsets;
  }

  async getLocation(profileInput: IProfile): Promise<ILocation> {
    const profile = await this.getProfileOrFail(profileInput.id, {
      relations: ['location'],
    });
    if (!profile.location) {
      throw new EntityNotInitializedException(
        `Profile not initialized: ${profile.id}`,
        LogContext.COMMUNITY
      );
    }
    return profile.location;
  }
}
