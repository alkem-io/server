import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@InputType()
export class MovePostInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'ID of the Post to move.',
  })
  postID!: string;

  @Field(() => UUID, {
    nullable: false,
    description: 'ID of the Callout to move the Post to.',
  })
  calloutID!: string;
}
