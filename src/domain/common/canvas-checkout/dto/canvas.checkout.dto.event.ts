import { InputType, Field } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { UUID } from '@domain/common/scalars';

@InputType()
export class CanvasCheckoutEventInput {
  @Field(() => UUID, { nullable: false })
  canvasCheckoutID!: string;

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
