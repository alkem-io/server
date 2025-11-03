import { Field, InputType, ObjectType } from '@nestjs/graphql';

@InputType()
@ObjectType('WhiteboardPreviewCoordinatesData')
export class WhiteboardPreviewCoordinatesInput {
  @Field(() => Number, {
    nullable: false,
    description: 'The x coordinate.',
  })
  x!: number;

  @Field(() => Number, {
    nullable: false,
    description: 'The y coordinate.',
  })
  y!: number;

  @Field(() => Number, {
    nullable: false,
    description: 'The height.',
  })
  height!: number;

  @Field(() => Number, {
    nullable: false,
    description: 'The width.',
  })
  width!: number;
}
