import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaGallery } from './media.gallery.entity';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CreateMediaGalleryInput, UpdateMediaGalleryInput } from './dto';
import { IMediaGallery } from './media.gallery.interface';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { FindOneOptions } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { LogContext } from '@common/enums/logging.context';
import { ProfileService } from '@domain/common/profile/profile.service';
import { Visual } from '@domain/common/visual/visual.entity';

@Injectable()
export class MediaGalleryService {
  constructor(
    @InjectRepository(MediaGallery)
    private readonly mediaGalleryRepository: Repository<MediaGallery>,
    private readonly authorizationService: AuthorizationService,
    private readonly profileService: ProfileService
  ) {}

  public async createMediaGallery(
    mediaGalleryData: CreateMediaGalleryInput,
    storageAggregator: IStorageAggregator,
    userID?: string
  ): Promise<IMediaGallery> {
    const mediaGallery = MediaGallery.create({});
    mediaGallery.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.MEDIA_GALLERY
    );
    mediaGallery.createdBy = userID;

    // Visuals are usually attached to a Profile, but here they are attached to MediaGallery directly.
    // However, Visual entity expects a Profile relation or MediaGallery relation.
    // We need to handle the creation of Visual entities.

    mediaGallery.visuals = mediaGalleryData.visuals.map(visualData => {
      const visual = new Visual();
      Object.assign(visual, visualData);
      return visual;
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

    // Replace visuals
    // Since we have cascade: true, we can just assign new visuals.
    // But we might need to handle deletion of old ones if TypeORM doesn't do it automatically with OneToMany cascade.
    // Usually for OneToMany with cascade, replacing the array works if orphanRemoval is true (which TypeORM doesn't support directly like Hibernate).
    // We might need to manually delete old visuals or rely on a specific update strategy.
    // For now, let's try replacing the list.

    // Actually, to ensure clean update, let's clear existing visuals first if needed,
    // but TypeORM's save with cascade should handle new entities.
    // For removing old ones, we might need to delete them explicitly if they are not in the new list.

    // A simple approach: delete all existing visuals and add new ones.
    // Or just update the list.

    mediaGallery.visuals = updateData.visuals.map(visualData => {
      const visual = new Visual();
      Object.assign(visual, visualData);
      return visual;
    });

    return await this.mediaGalleryRepository.save(mediaGallery);
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
