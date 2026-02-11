import { VisualType } from '@common/enums/visual.type';
import { Field, InputType, ObjectType } from '@nestjs/graphql';

@InputType()
@ObjectType('CreateVisualOnProfileData')
export class CreateVisualOnProfileInput {
  @Field(() => VisualType, {
    nullable: false,
    description: 'The type of visual.',
  })
  name!: VisualType;

  @Field(() => String, {
    nullable: false,
    description:
      'The URI of the image. Needs to be a url inside Alkemio already uploaded to a StorageBucket. It will be then copied to the Profile holding this Visual.',
  })
  uri!: string;
}
