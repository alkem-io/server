import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class TransferCalloutInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Callout to be transferred.',
  })
  calloutID!: string;

  @Field(() => UUID, {
    nullable: false,
    description:
      'The target CalloutsSet to which the Callout will be transferred.',
  })
  targetCalloutsSetID!: string;
}
