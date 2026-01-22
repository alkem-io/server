import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@InputType()
export class RemoveDefaultCalloutTemplateOnInnovationFlowStateInput {
  @Field(() => UUID, { nullable: false })
  flowStateID!: string;
}
