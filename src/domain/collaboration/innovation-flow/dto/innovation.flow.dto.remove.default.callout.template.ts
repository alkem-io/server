import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveDefaultCalloutTemplateOnInnovationFlowStateInput {
  @Field(() => UUID, { nullable: false })
  flowStateID!: string;
}
