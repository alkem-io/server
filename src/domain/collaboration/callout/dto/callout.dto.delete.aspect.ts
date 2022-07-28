import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DeleteAspectOnCalloutInput {
  @Field(() => UUID, { nullable: false })
  calloutID!: string;

  @Field(() => UUID, { nullable: false })
  aspectID!: string;
}
