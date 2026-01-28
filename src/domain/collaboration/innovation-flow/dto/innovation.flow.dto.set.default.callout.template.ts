import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class SetDefaultCalloutTemplateOnInnovationFlowStateInput {
  @Field(() => UUID, { nullable: false })
  flowStateID!: string;

  @Field(() => UUID, { nullable: false })
  templateID!: string;
}
