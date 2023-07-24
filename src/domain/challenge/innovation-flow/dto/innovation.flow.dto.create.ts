import { InnovationFlowType } from '@common/enums/innovation.flow.type';
import { CreateProfileInput } from '@domain/common/profile/dto';

export class CreateInnovationFlowInput {
  innovationFlowTemplateID?: string;

  type!: InnovationFlowType;

  profile!: CreateProfileInput;

  spaceID!: string;
}
