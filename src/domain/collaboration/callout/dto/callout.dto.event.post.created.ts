import { IPost } from '@src/domain/collaboration/post/post.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CalloutPostCreated')
export class CalloutPostCreated {
  eventID!: string;

  @Field(() => String, {
    nullable: false,
    description:
      'The identifier for the Callout on which the post was created.',
  })
  calloutID!: string;

  @Field(() => IPost, {
    nullable: false,
    description: 'The post that has been created.',
  })
  post!: IPost;
}
