import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('WhiteboardContentUpdated')
export class WhiteboardContentUpdated {
  // give a unique identifier
  eventID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The identifier for the Whiteboard.',
  })
  whiteboardID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The updated content.',
  })
  value!: string;
}
