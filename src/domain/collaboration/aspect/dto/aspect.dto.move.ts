import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@InputType()
export class MoveAspectInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'ID of the Aspect to move.',
  })
  aspectID!: string;

  @Field(() => UUID, {
    nullable: false,
    description: 'ID of the Callout to move the Aspect to.',
  })
  calloutID!: string;
}
