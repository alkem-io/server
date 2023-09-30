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
import { Reference } from '@domain/common/reference/reference.entity';
import { IReference } from '@domain/common/reference/reference.interface';
import { ReferenceService } from '@domain/common/reference/reference.service';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { Profile } from '@domain/common/profile/profile.entity';
import { IProfile } from '@domain/common/profile/profile.interface';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { VisualService } from '@domain/common/visual/visual.service';
import { IVisual } from '@domain/common/visual/visual.interface';
import { CreateProfileInput, UpdateProfileInput } from './dto';
import { CreateReferenceOnProfileInput } from './dto/profile.dto.create.reference';
import { ILocation, LocationService } from '@domain/common/location';
import { VisualType } from '@common/enums/visual.type';
import { CreateTagsetInput } from '../tagset';
import { ITagsetTemplate } from '../tagset-template/tagset.template.interface';
import { TagsetTemplateService } from '../tagset-template/tagset.template.service';
import { UpdateProfileSelectTagsetInput } from './dto/profile.dto.update.select.tagset';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';

@Injectable()
export class ProfileService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private storageBucketService: StorageBucketService,
    private tagsetService: TagsetService,
    private tagsetTemplateService: TagsetTemplateService,
    private referenceService: ReferenceService,
    private visualService: VisualService,
    private locationService: LocationService,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  // Create an empty profile, that the creating entity then has to
  // add tagets / visuals to.
  async createProfile(profileData?: CreateProfileInput): Promise<IProfile> {
    const profile: IProfile = Profile.create({
      description: profileData?.description,
      tagline: profileData?.tagline,
      displayName: profileData?.displayName,
    });
    profile.authorization = new AuthorizationPolicy();
    profile.storageBucket = await this.storageBucketService.createStorageBucket(
      {}
    );

    profile.visuals = [];
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
    await this.profileRepository.save(profile);
    this.logger.verbose?.(
      `Created new profile with id: ${profile.id}`,
      LogContext.COMMUNITY
    );

    profile.tagsets = [];
    if (profileData?.tagsets) {
      for (const tagsetData of profileData?.tagsets) {
        const tagset = await this.tagsetService.createTagsetWithName(
          profile.tagsets,
          tagsetData
        );
        profile.tagsets.push(tagset);
      }
    }

    return await this.save(profile);
  }

  async updateProfile(
    profileOrig: IProfile,
    profileData: UpdateProfileInput
  ): Promise<IProfile> {
    const profile = await this.getProfileOrFail(profileOrig.id, {
      relations: [
        'references',
        'tagsets',
        'authorization',
        'location',
        'visuals',
      ],
    });

    if (profileData.description !== undefined) {
      profile.description = profileData.description;
    }

    if (profileData.displayName !== undefined) {
      profile.displayName = profileData.displayName;
    }

    if (profileData.tagline !== undefined) {
      profile.tagline = profileData.tagline;
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
        'location',
        'tagsets',
        'authorization',
        'visuals',
        'storageBucket',
      ],
    });

    if (profile.tagsets) {
      for (const tagset of profile.tagsets) {
        await this.tagsetService.removeTagset(tagset.id);
      }
    }

    if (profile.references) {
      for (const reference of profile.references) {
        await this.referenceService.deleteReference({
          ID: reference.id,
        });
      }
    }

    if (profile.storageBucket) {
      await this.storageBucketService.deleteStorageBucket(
        profile.storageBucket.id
      );
    }

    if (profile.visuals) {
      for (const visual of profile.visuals) {
        await this.visualService.deleteVisual({ ID: visual.id });
      }
    }

    if (profile.location) {
      await this.locationService.removeLocation(profile.location);
    }

    if (profile.authorization)
      await this.authorizationPolicyService.delete(profile.authorization);

    return await this.profileRepository.remove(profile as Profile);
  }

  async save(profile: IProfile): Promise<IProfile> {
    return await this.profileRepository.save(profile);
  }

  async addVisualOnProfile(
    profile: IProfile,
    visualType: VisualType,
    url?: string
  ) {
    let visual: IVisual;
    switch (visualType) {
      case VisualType.AVATAR:
        visual = await this.visualService.createVisualAvatar();
        break;
      case VisualType.BANNER:
        visual = await this.visualService.createVisualBanner();
        break;
      case VisualType.CARD:
        visual = await this.visualService.createVisualCard();
        break;
      case VisualType.BANNER_WIDE:
        visual = await this.visualService.createVisualBannerWide();
        break;

      default:
        throw new Error(
          `Unable to recognise type of visual requested: ${visualType}`
        );
    }
    if (url) {
      visual.uri = url;
    }
    if (!profile.visuals) {
      throw new EntityNotInitializedException(
        `No visuals found on profile: ${profile.id}`,
        LogContext.COMMUNITY
      );
    }
    profile.visuals.push(visual);
  }

  async addTagsetOnProfile(
    profile: IProfile,
    tagsetData: CreateTagsetInput
  ): Promise<ITagset> {
    profile.tagsets = await this.getTagsets(profile);
    const tagset = await this.tagsetService.createTagsetWithName(
      profile.tagsets,
      tagsetData
    );
    profile.tagsets.push(tagset);

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
  ): Promise<IProfile | never> {
    const profile = await Profile.findOne({
      ...options,
      where: { ...options?.where, id: profileID },
    });
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

  async getVisuals(profileInput: IProfile): Promise<IVisual[]> {
    const profile = await this.getProfileOrFail(profileInput.id, {
      relations: ['visuals'],
    });
    if (!profile.visuals) {
      throw new EntityNotInitializedException(
        `Profile not initialized: ${profile.id}`,
        LogContext.COMMUNITY
      );
    }
    return profile.visuals;
  }

  async getVisual(
    profileInput: IProfile,
    visualType: VisualType
  ): Promise<IVisual | undefined> {
    const visuals = await this.getVisuals(profileInput);
    const visual = visuals.find(v => v.name === visualType);
    // if (!visual) {
    //   throw new EntityNotInitializedException(
    //     `Unable to find visual with name '${visualType}' on ${profileInput.id}`,
    //     LogContext.COMMUNITY
    //   );
    // }
    return visual;
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

  async getTagset(profileID: string, tagsetName: string): Promise<ITagset> {
    const profile = await this.getProfileOrFail(profileID, {
      relations: ['tagsets'],
    });
    if (!profile.tagsets) {
      throw new EntityNotInitializedException(
        `Profile not initialized: ${profile.id}`,
        LogContext.COMMUNITY
      );
    }
    return this.tagsetService.getTagsetByNameOrFail(
      profile.tagsets,
      tagsetName
    );
  }

  async updateSelectTagset(
    updateData: UpdateProfileSelectTagsetInput
  ): Promise<ITagset> {
    const tagset = await this.getTagset(
      updateData.profileID,
      updateData.tagsetName
    );
    if (updateData.tags) {
      tagset.tags = updateData.tags;
      await this.tagsetService.save(tagset);
    }

    if (updateData.allowedValues) {
      const tagsetTemplate = await this.tagsetService.getTagsetTemplateOrFail(
        tagset.id,
        true
      );
      await this.tagsetTemplateService.updateTagsetTemplate(tagsetTemplate, {
        allowedValues: updateData.allowedValues,
        defaultSelectedValue: updateData.defaultSelectedValue,
      });
    }
    return tagset;
  }

  public convertTagsetTemplatesToCreateTagsetInput(
    tagsetTemplates: ITagsetTemplate[]
  ): CreateTagsetInput[] {
    const result: CreateTagsetInput[] = [];
    for (const tagsetTemplate of tagsetTemplates) {
      const input: CreateTagsetInput = {
        name: tagsetTemplate.name,
        type: tagsetTemplate.type,
        tagsetTemplate: tagsetTemplate,
        tags: tagsetTemplate.defaultSelectedValue
          ? [tagsetTemplate.defaultSelectedValue]
          : undefined,
      };
      result.push(input);
    }
    return result;
  }

  // Note: purovided data has priority when it comes to tags
  public updateProfileTagsetInputs(
    tagsetInputDtata: CreateTagsetInput[] | undefined,
    additionalTagsetInputs: CreateTagsetInput[]
  ): CreateTagsetInput[] {
    const result: CreateTagsetInput[] = [...additionalTagsetInputs];

    if (!tagsetInputDtata) return result;

    for (const tagsetInput of tagsetInputDtata) {
      const existingInput = result.find(t => t.name === tagsetInput.name);
      if (existingInput) {
        // Do not change type, name etc - only tags
        if (tagsetInput.tags) {
          existingInput.tags = tagsetInput.tags;
        }
      } else {
        result.push(tagsetInput);
      }
    }
    return result;
  }
}
