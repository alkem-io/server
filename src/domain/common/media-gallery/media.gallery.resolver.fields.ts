import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { MediaGalleryType } from './media.gallery.interface';
import { IVisual } from '@domain/common/visual/visual.interface';
import { MediaGalleryService } from './media.gallery.service';

@Resolver(() => MediaGalleryType)
export class MediaGalleryResolverFields {
  constructor(private readonly mediaGalleryService: MediaGalleryService) {}

  @ResolveField('visuals', () => [IVisual], {
    nullable: true,
    description: 'The visuals contained in this media gallery.',
  })
  async visuals(@Parent() mediaGallery: MediaGalleryType): Promise<IVisual[]> {
    if (mediaGallery.visuals) {
      return mediaGallery.visuals;
    }

    const hydratedGallery =
      await this.mediaGalleryService.getMediaGalleryOrFail(mediaGallery.id, {
        relations: { visuals: true },
      });

    return hydratedGallery.visuals ?? [];
  }
}
