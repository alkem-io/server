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
import { Reference, IReference } from '@domain/common/reference';
import { ReferenceService } from '@domain/common/reference/reference.service';
import { ITagset } from '@domain/common/tagset';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import {
  UpdateProfileInput,
  Profile,
  IProfile,
  CreateReferenceOnProfileInput,
  CreateProfileInput,
  CreateTagsetOnProfileInput,
} from '@domain/community/profile';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';

@Injectable()
export class ProfileService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private tagsetService: TagsetService,
    private referenceService: ReferenceService,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  private readonly minImageSize = 190;
  private readonly maxImageSize = 410;

  async createProfile(profileData?: CreateProfileInput): Promise<IProfile> {
    let data = profileData;
    if (!data) data = {};
    const profile: IProfile = Profile.create({
      avatar: profileData?.avatar,
      description: profileData?.description,
      tagsets: profileData?.tagsetsData,
      references: profileData?.referencesData,
    });
    profile.authorization = new AuthorizationPolicy();
    if (!profile.references) {
      profile.references = [];
    }

    if (!profile.tagsets) {
      profile.tagsets = [];
    }

    await this.profileRepository.save(profile);
    this.logger.verbose?.(
      `Created new profile with id: ${profile.id}`,
      LogContext.COMMUNITY
    );
    return profile;
  }

  async updateProfile(profileData: UpdateProfileInput): Promise<IProfile> {
    const profile = await this.getProfileOrFail(profileData.ID);

    if (profileData.avatar) {
      profile.avatar = profileData.avatar;
    }
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

    return await this.profileRepository.save(profile);
  }

  async deleteProfile(profileID: string): Promise<IProfile> {
    // Note need to load it in with all contained entities so can remove fully
    const profile = await this.getProfileOrFail(profileID);

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

    if (profile.authorization)
      await this.authorizationPolicyService.delete(profile.authorization);

    return await this.profileRepository.remove(profile as Profile);
  }

  async createTagset(tagsetData: CreateTagsetOnProfileInput): Promise<ITagset> {
    const profile = await this.getProfileOrFail(tagsetData.profileID);

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
    const profile = await this.getProfileOrFail(referenceInput.profileID);

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

  async getProfileOrFail(profileID: string): Promise<IProfile> {
    const profile = await Profile.findOne({ id: profileID });
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
}
