import { CreateInnovationFlowStateInput } from '@domain/collaboration/innovation-flow-state/dto/innovation.flow.state.dto.create';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateStateOnInnovationFlowInput extends CreateInnovationFlowStateInput {
  @Field(() => UUID, { nullable: false })
  innovationFlowID!: string;
}
