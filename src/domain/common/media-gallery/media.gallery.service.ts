import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOneOptions } from 'typeorm';
import { MediaGallery } from './media.gallery.entity';
import { CreateMediaGalleryInput, UpdateMediaGalleryInput } from './dto';
import { IMediaGallery } from './media.gallery.interface';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { LogContext } from '@common/enums/logging.context';
import { ProfileService } from '@domain/common/profile/profile.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Visual } from '@domain/common/visual/visual.entity';
import { VisualService } from '@domain/common/visual/visual.service';
import { ProfileType } from '@common/enums/profile.type';
import { DocumentService } from '@domain/storage/document/document.service';
import { VisualType } from '@common/enums/visual.type';
import { DEFAULT_VISUAL_CONSTRAINTS } from '@domain/common/visual/visual.constraints';
import type { CreateVisualInput } from '@domain/common/visual/dto/visual.dto.create';

type MediaGalleryVisualInput = Partial<
  Pick<
    CreateVisualInput,
    | 'type'
    | 'uri'
    | 'alternativeText'
    | 'minWidth'
    | 'maxWidth'
    | 'minHeight'
    | 'maxHeight'
    | 'aspectRatio'
  >
> & { uri?: string };

@Injectable()
export class MediaGalleryService {
  constructor(
    @InjectRepository(MediaGallery)
    private readonly mediaGalleryRepository: Repository<MediaGallery>,
    private readonly profileService: ProfileService,
    private readonly visualService: VisualService,
    private readonly documentService: DocumentService,
    private readonly authorizationPolicyService: AuthorizationPolicyService
  ) {}

  public async createMediaGallery(
    mediaGalleryData: CreateMediaGalleryInput,
    storageAggregatorId: string,
    userID?: string
  ): Promise<IMediaGallery> {
    const mediaGallery = MediaGallery.create({
      nameID: mediaGalleryData.nameID,
    });
    mediaGallery.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.MEDIA_GALLERY
    );
    mediaGallery.createdBy = userID;

    // Create profile with storage bucket for the media gallery
    // Note: The storage aggregator is for the profile's storage bucket
    mediaGallery.profile = (await this.profileService.createProfile(
      {
        displayName: mediaGalleryData.nameID || 'Media Gallery',
        description: 'Media Gallery',
      },
      ProfileType.CALLOUT_FRAMING,
      { id: storageAggregatorId } as any
    )) as any;

    // Create visuals using VisualService - use URI from DTO as-is
    mediaGallery.visuals = await this.createMediaGalleryVisuals(
      mediaGalleryData.visuals
    );

    return await this.mediaGalleryRepository.save(mediaGallery);
  }

  public async updateMediaGallery(
    mediaGalleryId: string,
    updateData: UpdateMediaGalleryInput
  ): Promise<IMediaGallery> {
    const mediaGallery = await this.mediaGalleryRepository.findOneOrFail({
      where: { id: mediaGalleryId },
      relations: { visuals: true },
    });

    // Replace visuals using VisualService - use URI from DTO as-is
    mediaGallery.visuals = await this.createMediaGalleryVisuals(
      updateData.visuals
    );

    return await this.mediaGalleryRepository.save(mediaGallery);
  }

  public async deleteMediaGallery(
    mediaGalleryId: string
  ): Promise<IMediaGallery> {
    const mediaGallery = await this.getMediaGalleryOrFail(mediaGalleryId, {
      relations: {
        authorization: true,
        profile: true,
        visuals: true,
      },
    });

    if (!mediaGallery.profile) {
      throw new RelationshipNotFoundException(
        `Profile not found on media gallery: '${mediaGallery.id}'`,
        LogContext.COLLABORATION
      );
    }

    if (!mediaGallery.authorization) {
      throw new RelationshipNotFoundException(
        `Authorization not found on media gallery: '${mediaGallery.id}'`,
        LogContext.COLLABORATION
      );
    }

    // Delete visuals
    if (mediaGallery.visuals) {
      for (const visual of mediaGallery.visuals) {
        await this.visualService.deleteVisual({ ID: visual.id });
      }
    }

    await this.profileService.deleteProfile(mediaGallery.profile.id);
    await this.authorizationPolicyService.delete(mediaGallery.authorization);

    const deletedMediaGallery = await this.mediaGalleryRepository.remove(
      mediaGallery as MediaGallery
    );
    deletedMediaGallery.id = mediaGalleryId;
    return deletedMediaGallery;
  }

  public async getMediaGalleryOrFail(
    mediaGalleryID: string,
    options?: FindOneOptions<MediaGallery>
  ): Promise<IMediaGallery> {
    const mediaGallery = await this.mediaGalleryRepository.findOne({
      where: { id: mediaGalleryID },
      ...options,
    });

    if (!mediaGallery) {
      throw new EntityNotFoundException(
        `No MediaGallery found with the given id: ${mediaGalleryID}`,
        LogContext.COLLABORATION
      );
    }
    return mediaGallery;
  }

  private async createMediaGalleryVisuals(
    visuals: MediaGalleryVisualInput[]
  ): Promise<Visual[]> {
    return await Promise.all(
      visuals.map(async visualInput =>
        this.buildMediaGalleryVisual(visualInput)
      )
    );
  }

  private async buildMediaGalleryVisual(
    visualInput: MediaGalleryVisualInput
  ): Promise<Visual> {
    const resolvedType = await this.resolveMediaGalleryVisualType(
      visualInput.type,
      visualInput.uri
    );
    const constraints = DEFAULT_VISUAL_CONSTRAINTS[resolvedType];
    const mergedInput = {
      ...visualInput,
      minWidth:
        'minWidth' in visualInput && visualInput.minWidth !== undefined
          ? visualInput.minWidth
          : constraints.minWidth,
      maxWidth:
        'maxWidth' in visualInput && visualInput.maxWidth !== undefined
          ? visualInput.maxWidth
          : constraints.maxWidth,
      minHeight:
        'minHeight' in visualInput && visualInput.minHeight !== undefined
          ? visualInput.minHeight
          : constraints.minHeight,
      maxHeight:
        'maxHeight' in visualInput && visualInput.maxHeight !== undefined
          ? visualInput.maxHeight
          : constraints.maxHeight,
      aspectRatio:
        'aspectRatio' in visualInput && visualInput.aspectRatio !== undefined
          ? visualInput.aspectRatio
          : constraints.aspectRatio,
    } as MediaGalleryVisualInput;

    const visual = this.visualService.createVisual(
      {
        ...(mergedInput as any),
        type: resolvedType,
      },
      visualInput.uri
    ) as Visual;

    visual.allowedTypes = [...constraints.allowedTypes];

    return visual;
  }

  private async resolveMediaGalleryVisualType(
    providedType: VisualType | undefined,
    uri?: string
  ): Promise<VisualType> {
    const inferredType = uri
      ? await this.inferVisualTypeFromUri(uri)
      : undefined;

    // If caller explicitly provided a visual type (e.g. legacy banner), never override it.
    if (providedType && !this.isMediaGalleryVisualType(providedType)) {
      return providedType;
    }

    // When providedType is one of the new media gallery variants, prefer inferred type if any.
    if (
      providedType &&
      this.isMediaGalleryVisualType(providedType) &&
      inferredType
    ) {
      return inferredType;
    }

    if (providedType) {
      return providedType;
    }

    return inferredType ?? VisualType.MEDIA_GALLERY_IMAGE;
  }

  private async inferVisualTypeFromUri(
    uri: string
  ): Promise<VisualType | undefined> {
    const document = await this.documentService.getDocumentFromURL(uri);
    const mimeType = document?.mimeType;

    if (!mimeType) {
      return undefined;
    }

    if (mimeType.startsWith('video/')) {
      return VisualType.MEDIA_GALLERY_VIDEO;
    }

    if (mimeType.startsWith('image/')) {
      return VisualType.MEDIA_GALLERY_IMAGE;
    }

    return undefined;
  }

  private isMediaGalleryVisualType(type: VisualType): boolean {
    return (
      type === VisualType.MEDIA_GALLERY_IMAGE ||
      type === VisualType.MEDIA_GALLERY_VIDEO
    );
  }
}
