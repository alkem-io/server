import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('MessageParent', {
  description:
    'Details about the parent entity that is using the room the message was sent in.',
})
export abstract class MessageParent {
  @Field(() => String, {
    nullable: false,
    description: 'The ID of the parent entity.',
  })
  id!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The display name of the parent entity.',
  })
  displayName!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The URL of the parent entity.',
  })
  url!: string;
}
