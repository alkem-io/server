import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('WhiteboardSavedSubscriptionResult', {
  description: 'The save event happened in the subscribed whiteboard.',
})
export class WhiteboardSavedSubscriptionResult {
  @Field(() => String, {
    nullable: false,
    description:
      'The identifier for the Whiteboard on which the save event happened.',
  })
  whiteboardID!: string;

  @Field(() => Date, {
    description: 'The date at which the Whiteboard was last updated.',
    nullable: true,
  })
  updatedDate!: Date;
}
