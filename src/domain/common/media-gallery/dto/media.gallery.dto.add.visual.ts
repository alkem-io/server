import { VisualType } from '@common/enums/visual.type';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AddVisualToMediaGalleryInput {
  @Field(() => String, {
    description: 'The ID of the media gallery.',
  })
  mediaGalleryID!: string;

  @Field(() => VisualType, {
    description:
      'The type of visual to add (e.g. MEDIA_GALLERY_IMAGE, MEDIA_GALLERY_VIDEO).',
  })
  visualType!: VisualType;
}
