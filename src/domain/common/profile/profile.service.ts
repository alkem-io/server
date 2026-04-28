import { LogContext, ProfileType } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { VisualType } from '@common/enums/visual.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  NotSupportedException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ILocation, LocationService } from '@domain/common/location';
import { Profile } from '@domain/common/profile/profile.entity';
import { IProfile } from '@domain/common/profile/profile.interface';
import { IReference } from '@domain/common/reference/reference.interface';
import { ReferenceService } from '@domain/common/reference/reference.service';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { IVisual } from '@domain/common/visual/visual.interface';
import { VisualService } from '@domain/common/visual/visual.service';
import { ProfileDocumentsService } from '@domain/profile-documents/profile.documents.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DEFAULT_AVATAR_SERVICE_URL } from '@services/external/avatar-creator/avatar.creator.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { CreateTagsetInput } from '../tagset';
import { ITagsetTemplate } from '../tagset-template/tagset.template.interface';
import { CreateProfileInput, UpdateProfileInput } from './dto';
import { CreateReferenceOnProfileInput } from './dto/profile.dto.create.reference';
import { CreateVisualOnProfileInput } from './dto/profile.dto.create.visual';

@Injectable()
export class ProfileService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private storageBucketService: StorageBucketService,
    private tagsetService: TagsetService,
    private referenceService: ReferenceService,
    private visualService: VisualService,
    private locationService: LocationService,
    private profileDocumentsService: ProfileDocumentsService,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  /**
   * Phase 1 of profile materialization: build the in-memory entity graph.
   *
   * No file-service-go calls happen here. The storageBucket is created
   * unsaved and assigned to the profile; the caller is expected to assign
   * the profile to a parent entity that cascades save (or to save it
   * directly), then call {@link materializeProfileContent} to perform the
   * post-save content re-uploads (markdown documents, references, etc).
   *
   * This split exists because the file-service-go migration (PR #5969)
   * moved Document ownership outside the server's TypeORM transaction;
   * any cross-service call needs a real persisted `storageBucket.id` to
   * FK onto. Doing both phases in one method led to
   * `StorageBucket not found: undefined` (issues #6004 / #6005).
   *
   * Tagsets and references are constructed with their input URIs as-is.
   * `materializeProfileContent` is the place where any internal Alkemio
   * URLs in the description/references are re-homed into the new bucket.
   */
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
    profile.storageBucket = this.storageBucketService.createStorageBucket({
      storageAggregator: storageAggregator,
    });
    profile.visuals = [];
    profile.location = await this.locationService.createLocation(
      profileData?.location
    );
    profile.references = (profileData?.referencesData ?? []).map(reference =>
      this.referenceService.createReference(reference)
    );
    profile.tagsets = (profileData?.tagsets ?? []).map(tagsetData =>
      this.tagsetService.createTagsetWithName([], tagsetData)
    );

    return profile;
  }

  /**
   * Phase 2: post-save content re-upload. Must be called AFTER the profile
   * (and its storageBucket) has been persisted — typically via the parent
   * entity's cascade save. Re-homes any internal Alkemio document URLs
   * found in the description and references into the profile's bucket.
   *
   * Idempotent for content already in the destination bucket and a no-op
   * if there's no internal URL to re-home, so it's safe to call from any
   * caller whether or not the input data references existing documents.
   *
   * Throws `EntityNotInitializedException` if the bucket isn't persisted
   * yet — that's a programmer error, not a runtime condition.
   */
  public async materializeProfileContent(profile: IProfile): Promise<IProfile> {
    if (!profile.storageBucket?.id) {
      throw new EntityNotInitializedException(
        `Profile storage bucket must be persisted before materializing content: profile ${profile.id}`,
        LogContext.PROFILE
      );
    }
    if (profile.description) {
      profile.description =
        await this.profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket(
          profile.description,
          profile.storageBucket
        );
    }
    for (const reference of profile.references ?? []) {
      const newUrl =
        await this.profileDocumentsService.reuploadFileOnStorageBucket(
          reference.uri,
          profile.storageBucket,
          false
        );
      if (newUrl) {
        reference.uri = newUrl;
      }
    }
    return profile;
  }

  /**
   * Convenience for the standard post-save materialization: re-home internal
   * Alkemio URLs in description/references AND attach visuals. Idempotent and
   * safe to call when there's nothing to materialize. Persists the result so
   * callers don't need a follow-up `save`.
   *
   * Precondition: `profile.storageBucket` must be persisted (typically via
   * the parent entity's cascade save). See {@link materializeProfileContent}.
   */
  public async materializeProfileContentAndVisuals(
    profile: IProfile,
    visualsData: CreateVisualOnProfileInput[] | undefined,
    visualTypes: VisualType[]
  ): Promise<IProfile> {
    await this.materializeProfileContent(profile);
    if (visualTypes.length > 0) {
      await this.addVisualsOnProfile(profile, visualsData, visualTypes);
    }
    return await this.profileRepository.save(profile);
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

    if (profileData.location && profile.location) {
      profile.location = await this.locationService.updateLocation(
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

  private isTrustedExternalAvatarHost(candidate: string): boolean {
    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      return false;
    }
    if (parsed.protocol !== 'https:') {
      return false;
    }
    return ProfileService.TRUSTED_EXTERNAL_AVATAR_HOSTS.has(
      parsed.hostname.toLowerCase()
    );
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
        case VisualType.WHITEBOARD_PREVIEW:
          visual = this.visualService.createVisualWhiteboardPreview();
          break;
        case VisualType.CARD:
          visual = this.visualService.createVisualCard();
          break;
        case VisualType.BANNER_WIDE:
          visual = this.visualService.createVisualBannerWide();
          break;
        case VisualType.MEDIA_GALLERY_IMAGE:
          visual = this.visualService.createVisualMediaGalleryImage();
          break;
        case VisualType.MEDIA_GALLERY_VIDEO:
          visual = this.visualService.createVisualMediaGalleryVideo();
          break;

        default:
          throw new NotSupportedException(
            `Unable to recognise type of visual requested: ${visualTypes}`,
            LogContext.PROFILE
          );
      }
      const providedVisual = visualsData?.find(v => v.name === visualType);
      if (providedVisual && providedVisual.uri.length > 0) {
        // External AVATAR URLs are allowed only from a small allowlist of trusted
        // hosts (our own fallback service and supported OIDC provider CDNs); the
        // subsequent ensureAvatarIsStoredInLocalStorageBucket step downloads and
        // re-hosts the image locally. Keeping the allowlist narrow limits SSRF
        // exposure in user-controlled profile inputs.
        const allowExternalUrl =
          visualType === VisualType.AVATAR &&
          this.isTrustedExternalAvatarHost(providedVisual.uri);

        const url =
          await this.profileDocumentsService.reuploadFileOnStorageBucket(
            providedVisual.uri,
            profile.storageBucket,
            !allowExternalUrl
          );
        if (url) {
          visual.uri = url;
        } else {
          this.logger.warn(
            `Visual with URL '${providedVisual.uri}' ignored when creating profile ${profile.id}`,
            LogContext.PROFILE
          );
        }
      }
      profile.visuals.push(visual);
    }
    return profile;
  }

  async addOrUpdateTagsetOnProfile(
    profile: IProfile,
    tagsetData: CreateTagsetInput
  ): Promise<ITagset> {
    if (!profile.tagsets) {
      profile.tagsets = await this.getTagsets(profile);
    }

    const index = profile.tagsets.findIndex(
      tagset => tagset.name === tagsetData.name
    );

    if (index !== -1) {
      const newTags = tagsetData.tags ?? [];
      profile.tagsets[index].tags = Array.from(
        new Set([...profile.tagsets[index].tags, ...newTags])
      );

      return profile.tagsets[index];
    } else {
      const tagset = this.tagsetService.createTagsetWithName(
        profile.tagsets,
        tagsetData
      );
      profile.tagsets.push(tagset);

      return tagset;
    }
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
          LogContext.SPACE_ABOUT
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

  private static readonly TRUSTED_EXTERNAL_AVATAR_HOSTS = new Set<string>([
    new URL(DEFAULT_AVATAR_SERVICE_URL).hostname.toLowerCase(),
    'ui-avatars.com',
    'media.licdn.com',
    'media.licdn-ei.com',
    'avatars.githubusercontent.com',
    'graph.microsoft.com',
  ]);
}
