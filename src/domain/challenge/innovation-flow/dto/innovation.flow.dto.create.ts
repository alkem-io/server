import { InnovationFlowType } from '@common/enums/innovation.flow.type';

export class CreateInnovationFlowInput {
  innovationFlowTemplateID?: string;

  type!: InnovationFlowType;

  spaceID!: string;
}
