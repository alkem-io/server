import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('ForumDiscussionUpdated')
export class ForumDiscussionUpdated {
  // To identify the event
  eventID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The identifier for the Discussion that was updated.',
  })
  discussionID!: string;
}
