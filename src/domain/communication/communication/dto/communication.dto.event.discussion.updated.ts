import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CommunicationDiscussionUpdated')
export class CommunicationDiscussionUpdated {
  // To identify the event
  eventID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The identifier for the Discussion that was updated.',
  })
  discussionID!: string;
}
