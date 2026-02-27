import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DeleteVisualFromMediaGalleryInput {
  @Field(() => String, {
    description: 'The ID of the media gallery.',
  })
  mediaGalleryID!: string;

  @Field(() => String, {
    description: 'The ID of the visual to delete.',
  })
  visualID!: string;
}
