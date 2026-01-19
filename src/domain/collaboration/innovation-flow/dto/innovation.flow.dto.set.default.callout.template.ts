import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@InputType()
export class SetDefaultCalloutTemplateOnInnovationFlowStateInput {
  @Field(() => UUID, { nullable: false })
  flowStateID!: string;

  @Field(() => UUID, { nullable: false })
  templateID!: string;
}
