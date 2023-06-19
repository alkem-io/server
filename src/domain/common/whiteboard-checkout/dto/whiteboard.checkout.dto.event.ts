import { InputType, Field } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { UUID } from '@domain/common/scalars';

@InputType()
export class WhiteboardCheckoutEventInput {
  @Field(() => UUID, { nullable: false })
  whiteboardCheckoutID!: string;

  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  eventName!: string;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Report an error if this event fails to trigger a transition.',
    defaultValue: true,
  })
  errorOnFailedTransition!: boolean;
}
