import { registerEnumType } from '@nestjs/graphql';

export enum InnovationFlowType {
  CHALLENGE = 'challenge',
  OPPORTUNITY = 'opportunity',
}

registerEnumType(InnovationFlowType, {
  name: 'InnovationFlowType',
});
