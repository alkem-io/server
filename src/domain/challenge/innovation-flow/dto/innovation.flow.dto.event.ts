import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { SMALL_TEXT_LENGTH } from '@common/constants';
import { MaxLength } from 'class-validator';

@InputType()
export class InnovationFlowEvent {
  @Field(() => UUID, { nullable: false })
  innovationFlowID!: string;

  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  eventName!: string;
}
