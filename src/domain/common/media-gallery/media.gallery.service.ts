import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaGallery } from './media.gallery.entity';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CreateMediaGalleryInput, UpdateMediaGalleryInput } from './dto';
import { IMediaGallery } from './media.gallery.interface';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { FindOneOptions } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { LogContext } from '@common/enums/logging.context';
import { ProfileService } from '@domain/common/profile/profile.service';
import { Visual } from '@domain/common/visual/visual.entity';
import { VisualService } from '@domain/common/visual/visual.service';
import { ProfileType } from '@common/enums/profile.type';

@Injectable()
export class MediaGalleryService {
  constructor(
    @InjectRepository(MediaGallery)
    private readonly mediaGalleryRepository: Repository<MediaGallery>,
    private readonly authorizationService: AuthorizationService,
    private readonly profileService: ProfileService,
    private readonly visualService: VisualService
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
    mediaGallery.visuals = mediaGalleryData.visuals.map(visualData => {
      const visual = this.visualService.createVisual(
        visualData,
        visualData.uri
      );
      return visual as Visual;
    });

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
    mediaGallery.visuals = updateData.visuals.map(visualData => {
      const visual = this.visualService.createVisual(
        visualData as any,
        visualData.uri
      );
      return visual as Visual;
    });

    return await this.mediaGalleryRepository.save(mediaGallery);
  }

  private async getStorageAggregatorId(
    mediaGalleryId: string
  ): Promise<string> {
    // For now, we'll need to get the storage aggregator from the callout framing
    // This is a simplified approach - you may need to adjust based on your architecture
    const mediaGallery = await this.mediaGalleryRepository.findOne({
      where: { id: mediaGalleryId },
      relations: { visuals: true },
    });

    if (mediaGallery && mediaGallery.visuals.length > 0) {
      // Extract storage aggregator ID from existing visual URI
      const existingVisual = mediaGallery.visuals[0];
      const uriParts = existingVisual.uri.split('/');
      return uriParts[0]; // Assuming URI format is "storageAggregatorId/..."
    }

    // Fallback - this should be passed from the caller
    throw new Error('Unable to determine storage aggregator ID');
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
}
