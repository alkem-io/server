import { CreateInnovationFlowStateInput } from '@domain/challenge/innovation-flow-states/dto/innovation.flow.state.dto.create';
import { CreateProfileInput } from '@domain/common/profile/dto';

export class CreateInnovationFlowInput {
  profile!: CreateProfileInput;

  states!: CreateInnovationFlowStateInput[];
}
