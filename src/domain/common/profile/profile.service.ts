import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { AlkemioErrorStatus, LogContext, ProfileType } from '@common/enums';
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
import { UpdateProfileSelectTagsetDefinitionInput } from './dto/profile.dto.update.select.tagset.definition';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { UpdateProfileSelectTagsetValueInput } from './dto/profile.dto.update.select.tagset.value';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CreateVisualOnProfileInput } from './dto/profile.dto.create.visual';
import { DocumentService } from '@domain/storage/document/document.service';
import { BaseException } from '@common/exceptions/base.exception';
import { DocumentAuthorizationService } from '@domain/storage/document/document.service.authorization';
import { CreateReferenceInput } from '../reference';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';

@Injectable()
export class ProfileService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private storageBucketService: StorageBucketService,
    private tagsetService: TagsetService,
    private tagsetTemplateService: TagsetTemplateService,
    private referenceService: ReferenceService,
    private visualService: VisualService,
    private documentService: DocumentService,
    private documentAuthorizationService: DocumentAuthorizationService,
    private locationService: LocationService,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  // Create an empty profile, that the creating entity then has to
  // add tagets / visuals to.
  public async createProfile(
    profileData: CreateProfileInput,
    profileType: ProfileType,
    storageAggregator: IStorageAggregator
  ): Promise<IProfile> {
    const profile: IProfile = Profile.create({
      description: profileData?.description,
      tagline: profileData?.tagline,
      displayName: profileData?.displayName,
      type: profileType,
    });
    profile.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.PROFILE
    );
    // the next statement fails if it's not saved
    profile.storageBucket = this.storageBucketService.createStorageBucket({
      storageAggregator: storageAggregator,
    });
    profile.description = await this.reuploadDocumentsInMarkdownProfile(
      profile.description ?? '',
      profile.storageBucket
    );
    profile.visuals = [];
    profile.location = this.locationService.createLocation(
      profileData?.location
    );
    this.createReferencesOnProfile(profileData?.referencesData, profile);

    const tagsetsFromInput = profileData?.tagsets?.map(tagsetData =>
      this.tagsetService.createTagsetWithName([], tagsetData)
    );
    profile.tagsets = tagsetsFromInput ?? [];

    return profile;
  }

  private async createReferencesOnProfile(
    references: CreateReferenceInput[] | undefined,
    profile: IProfile
  ) {
    if (!profile.storageBucket) {
      throw new EntityNotInitializedException(
        `Storage bucket not initialized on profile: ${profile.id}`,
        LogContext.PROFILE
      );
    }
    const newReferences = [];
    for (const reference of references ?? []) {
      const newReference = this.referenceService.createReference(reference);
      const newUrl = await this.reuploadFileOnStorageBucket(
        newReference.uri,
        profile.storageBucket
      );
      if (newUrl) {
        newReference.uri = newUrl;
      }
      newReferences.push(newReference);
    }
    profile.references = newReferences;
  }

  async updateProfile(
    profileOrig: IProfile,
    profileData: UpdateProfileInput
  ): Promise<IProfile> {
    const profile = await this.getProfileOrFail(profileOrig.id, {
      relations: {
        references: true,
        tagsets: true,
        authorization: true,
        location: true,
        visuals: true,
      },
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
      relations: {
        references: true,
        location: true,
        tagsets: true,
        authorization: true,
        visuals: true,
        storageBucket: true,
      },
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

  public async addVisualsOnProfile(
    profile: IProfile,
    visualsData: CreateVisualOnProfileInput[] | undefined,
    visualTypes: VisualType[]
  ): Promise<IProfile> {
    if (!profile.visuals || !profile.storageBucket) {
      throw new EntityNotInitializedException(
        `No visuals or no storageBucket found on profile: ${profile.id}`,
        LogContext.COMMUNITY
      );
    }
    let visual: IVisual;
    for (const visualType of visualTypes) {
      switch (visualType) {
        case VisualType.AVATAR:
          visual = this.visualService.createVisualAvatar();
          break;
        case VisualType.BANNER:
          visual = this.visualService.createVisualBanner();
          break;
        case VisualType.CARD:
          visual = this.visualService.createVisualCard();
          break;
        case VisualType.BANNER_WIDE:
          visual = this.visualService.createVisualBannerWide();
          break;

        default:
          throw new Error(
            `Unable to recognise type of visual requested: ${visualTypes}`
          );
      }
      const providedVisual = visualsData?.find(v => v.name === visualType);
      if (providedVisual) {
        const url = await this.reuploadFileOnStorageBucket(
          providedVisual.uri,
          profile.storageBucket,
          true
        );
        if (url) {
          visual.uri = url;
        } else {
          this.logger.warn(
            `Visual with URL '${providedVisual.uri}' ignored when creating profile ${profile.id}`
          );
        }
      }
      profile.visuals.push(visual);
    }
    return profile;
  }

  /***
   * Checks if a url is living under the storage bucket
   * of a profile and re-uploads it if not there
   * @param fileUrl The url of the file to check
   * @param storageBucket The StorageBucket in which the file should be
   * @param alkemioRequired If true, the file must be inside Alkemio and if a fileUrl passed is outside Alkemio function will return undefined
   */
  private async reuploadFileOnStorageBucket(
    fileUrl: string,
    storageBucket: IStorageBucket,
    alkemioRequired: boolean = false
  ): Promise<string | undefined> {
    if (!this.documentService.isAlkemioDocumentURL(fileUrl)) {
      // If image is not inside Alkemio just return url (or undefined if image needs to be inside Alkemio, but never refetch it)
      if (alkemioRequired) {
        return undefined;
      } else {
        return fileUrl;
      }
    }

    if (!storageBucket.documents) {
      throw new EntityNotInitializedException(
        `Documents not initialized on storage bucket: '${storageBucket.id}'`,
        LogContext.PROFILE
      );
    }

    const docInContent = await this.documentService.getDocumentFromURL(fileUrl);

    if (!docInContent) {
      throw new BaseException(
        `File with URL '${fileUrl}' not found`,
        LogContext.COLLABORATION,
        AlkemioErrorStatus.NOT_FOUND
      );
    }

    const docInThisBucket = storageBucket.documents.find(
      doc => doc.id === docInContent.id
    );

    if (docInThisBucket) {
      // It should be just `fileUrl` but rewrite it just in case
      return this.documentService.getPubliclyAccessibleURL(docInThisBucket);
    } else if (docInContent.temporaryLocation) {
      // If it was temporary just move the document to the new bucket
      docInContent.storageBucket = storageBucket;
      docInContent.temporaryLocation = false;
      storageBucket.documents.push(docInContent);
      this.documentService.save(docInContent);
      return this.documentService.getPubliclyAccessibleURL(docInContent);
    } else {
      // if not in this bucket - create it inside it
      const newDoc = await this.documentService.createDocument({
        createdBy: docInContent.createdBy,
        displayName: docInContent.displayName,
        externalID: docInContent.externalID, // Point to the same content
        mimeType: docInContent.mimeType,
        size: docInContent.size,
        temporaryLocation: false,
      });
      storageBucket.documents.push(newDoc);
      await this.storageBucketService.addDocumentToStorageBucketOrFail(
        storageBucket,
        newDoc
      );
      return this.documentService.getPubliclyAccessibleURL(newDoc);
    }
  }

  private async reuploadDocumentsInMarkdownProfile(
    markdown: string,
    storageBucket: IStorageBucket
  ): Promise<string> {
    const baseUrl = this.documentService.getDocumentsBaseUrlPath() + '/';
    const escapedBaseUrl = baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const uuidPattern =
      '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
    const regex = new RegExp(`${escapedBaseUrl}(${uuidPattern})`, 'g');

    const matches = markdown.match(regex);
    if (matches?.length) {
      for (const match of matches) {
        const newUrl = await this.reuploadFileOnStorageBucket(
          match,
          storageBucket
        );
        if (newUrl) {
          markdown = markdown.replace(match, newUrl);
        }
      }
    }

    return markdown;
  }

  async addTagsetOnProfile(
    profile: IProfile,
    tagsetData: CreateTagsetInput
  ): Promise<ITagset> {
    if (!profile.tagsets) {
      profile.tagsets = await this.getTagsets(profile);
    }

    const tagset = this.tagsetService.createTagsetWithName(
      profile.tagsets,
      tagsetData
    );
    profile.tagsets.push(tagset);

    return tagset;
  }

  async createReference(
    referenceInput: CreateReferenceOnProfileInput
  ): Promise<IReference> {
    const profile = await this.getProfileOrFail(referenceInput.profileID, {
      relations: { references: true },
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
    const newReference =
      await this.referenceService.createReference(referenceInput);
    newReference.profile = profile;

    return await this.referenceService.save(newReference);
  }

  async deleteAllReferencesFromProfile(profileId: string): Promise<void> {
    const profile = await this.getProfileOrFail(profileId, {
      relations: { references: true },
    });

    if (!profile.references)
      throw new EntityNotInitializedException(
        'References not defined',
        LogContext.COMMUNITY
      );

    for (const reference of profile.references) {
      await this.referenceService.deleteReference({
        ID: reference.id,
      });
    }
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

  async getReferences(profileInput: IProfile): Promise<IReference[]> {
    const profile = await this.getProfileOrFail(profileInput.id, {
      relations: { references: true },
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
      relations: { visuals: true },
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
      relations: { tagsets: true },
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
      relations: { location: true },
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
      relations: { tagsets: true },
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

  async updateSelectTagsetDefinition(
    updateData: UpdateProfileSelectTagsetDefinitionInput
  ): Promise<ITagset> {
    const tagset = await this.getTagset(
      updateData.profileID,
      updateData.tagsetName
    );

    const tagsetTemplate = await this.tagsetService.getTagsetTemplateOrFail(
      tagset.id,
      true
    );
    await this.tagsetTemplateService.updateTagsetTemplateDefinition(
      tagsetTemplate,
      {
        allowedValues: updateData.allowedValues,
        defaultSelectedValue: updateData.defaultSelectedValue,
        newSelectedValue: updateData.newSelectedValue,
        oldSelectedValue: updateData.oldSelectedValue,
      }
    );

    return tagset;
  }

  async updateSelectTagsetValue(
    updateData: UpdateProfileSelectTagsetValueInput
  ): Promise<ITagset> {
    const tagset = await this.getTagset(
      updateData.profileID,
      updateData.tagsetName
    );
    return await this.tagsetService.updateTagset({
      ID: tagset.id,
      tags: [updateData.selectedValue],
    });
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
