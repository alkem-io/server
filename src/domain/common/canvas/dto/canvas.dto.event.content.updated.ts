import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CanvasContentUpdated')
export class CanvasContentUpdated {
  // give a unique identifier
  eventID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The identifier for the Canvas.',
  })
  canvasID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The updated content.',
  })
  value!: string;
}
