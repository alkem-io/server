import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { VisualType } from '@common/enums/visual.type';

@InputType()
@ObjectType('CreateVisualData')
export class CreateVisualInput {
  @Field(() => VisualType, {
    description: 'Type of visual to create (e.g. banner, avatar).',
  })
  name!: VisualType;

  @Field(() => Number, {
    description: 'Minimum allowed width for the visual.',
  })
  minWidth!: number;

  @Field(() => Number, {
    description: 'Maximum allowed width for the visual.',
  })
  maxWidth!: number;

  @Field(() => Number, {
    description: 'Minimum allowed height for the visual.',
  })
  minHeight!: number;

  @Field(() => Number, {
    description: 'Maximum allowed height for the visual.',
  })
  maxHeight!: number;

  @Field(() => Number, {
    description: 'Dimensions ratio width / height.',
  })
  aspectRatio!: number;

  @Field(() => String, {
    nullable: true,
    description: 'URI for the visual.',
  })
  uri?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Alternative text for the visual.',
  })
  alternativeText?: string;
}
