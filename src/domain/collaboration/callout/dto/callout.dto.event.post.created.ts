import { IPost } from '@src/domain/collaboration/post/post.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CalloutPostCreated')
export class CalloutPostCreated {
  eventID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The identifier of the Callout on which the post was created.',
  })
  calloutID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The identifier of the Contribution.',
  })
  contributionID!: string;

  @Field(() => Number, {
    nullable: false,
    description: 'he sorting order for this Contribution.',
  })
  sortOrder!: number;

  @Field(() => IPost, {
    nullable: false,
    description: 'The Post that has been created.',
  })
  post!: IPost;
}
