import { VisualType } from '@common/enums/visual.type';
import { InputType, Field, ObjectType } from '@nestjs/graphql';

@InputType()
@ObjectType('CreateVisualOnProfileData')
export class CreateVisualOnProfileInput {
  @Field(() => VisualType, {
    nullable: false,
    description: 'The type of visual.',
  })
  name!: VisualType;

  @Field(() => String, { nullable: false })
  uri!: string;
}
