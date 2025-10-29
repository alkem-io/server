import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateWhiteboardPreviewCoordinatesInput {
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
