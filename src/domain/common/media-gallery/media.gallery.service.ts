import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { LogContext } from '@common/enums/logging.context';
import { VisualType } from '@common/enums/visual.type';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { DEFAULT_VISUAL_CONSTRAINTS } from '@domain/common/visual/visual.constraints';
import { Visual } from '@domain/common/visual/visual.entity';
import { VisualService } from '@domain/common/visual/visual.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { IVisual } from '../visual';
import { MediaGallery } from './media.gallery.entity';
import { IMediaGallery } from './media.gallery.interface';

@Injectable()
export class MediaGalleryService {
  constructor(
    @InjectRepository(MediaGallery)
    private readonly mediaGalleryRepository: Repository<MediaGallery>,
    private readonly storageBucketService: StorageBucketService,
    private readonly visualService: VisualService,
    private readonly authorizationPolicyService: AuthorizationPolicyService
  ) {}

  public async createMediaGallery(
    storageAggregator: IStorageAggregator,
    userID?: string
  ): Promise<IMediaGallery> {
    const mediaGallery: IMediaGallery = MediaGallery.create();
    mediaGallery.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.MEDIA_GALLERY
    );
    mediaGallery.createdBy = userID;

    // the next statement fails if it's not saved
    mediaGallery.storageBucket = this.storageBucketService.createStorageBucket({
      storageAggregator,
    });

    mediaGallery.storageBucket = await this.storageBucketService.save(
      mediaGallery.storageBucket
    );

    // Create visuals using Media Gallery mutations
    mediaGallery.visuals = [] as Visual[];

    return await this.mediaGalleryRepository.save(mediaGallery);
  }

  public async addVisualToMediaGallery(
    mediaGalleryId: string,
    visualType: VisualType,
    sortOrder?: number
  ): Promise<IVisual> {
    const mediaGallery = await this.getMediaGalleryOrFail(mediaGalleryId, {
      relations: { visuals: true },
    });

    // Calculate the next sort order
    if (sortOrder === undefined) {
      if (mediaGallery.visuals && mediaGallery.visuals.length > 0) {
        const maxSortOrder = Math.max(
          ...mediaGallery.visuals.map(v => v.sortOrder ?? 0)
        );
        sortOrder = maxSortOrder + 1;
      } else {
        sortOrder = 1;
      }
    }

    const visualInput = {
      ...DEFAULT_VISUAL_CONSTRAINTS[visualType],
      name: visualType,
      mediaGallery: mediaGallery,
      sortOrder: sortOrder,
    };

    const visual = await this.visualService.createVisual(visualInput);
    await this.saveVisual(visual);

    if (!mediaGallery.visuals) {
      mediaGallery.visuals = [];
    }

    mediaGallery.visuals.push(visual as Visual);
    return visual;
  }

  public async saveVisual(visual: IVisual): Promise<IVisual> {
    return this.visualService.saveVisual(visual);
  }

  public async deleteVisualFromMediaGallery(
    mediaGalleryId: string,
    visualId: string
  ): Promise<IVisual> {
    const mediaGallery = await this.getMediaGalleryOrFail(mediaGalleryId, {
      relations: { visuals: true },
    });

    const visual = mediaGallery.visuals?.find(v => v.id === visualId);

    if (!visual) {
      throw new EntityNotFoundException(
        `Visual '${visualId}' not found in media gallery '${mediaGalleryId}'`,
        LogContext.COLLABORATION
      );
    }

    await this.visualService.deleteVisual({ ID: visualId });

    mediaGallery.visuals =
      mediaGallery.visuals?.filter(v => v.id !== visualId) || [];
    await this.mediaGalleryRepository.save(mediaGallery);

    return visual;
  }

  public async deleteMediaGallery(
    mediaGalleryId: string
  ): Promise<IMediaGallery> {
    const mediaGallery = await this.getMediaGalleryOrFail(mediaGalleryId, {
      relations: {
        authorization: true,
        storageBucket: true,
        visuals: true,
      },
    });

    if (!mediaGallery.storageBucket) {
      throw new RelationshipNotFoundException(
        `Storage bucket not found on media gallery: '${mediaGallery.id}'`,
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

    await this.storageBucketService.deleteStorageBucket(
      mediaGallery.storageBucket.id
    );
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

    // Sort visuals by sortOrder ascending
    if (mediaGallery.visuals && mediaGallery.visuals.length > 0) {
      mediaGallery.visuals.sort((a, b) => {
        const aSortOrder = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const bSortOrder = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
        return aSortOrder - bSortOrder;
      });
    }

    return mediaGallery;
  }
}
