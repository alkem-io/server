import { registerEnumType } from '@nestjs/graphql';

export enum VirtualContributorEngine {
  GUIDANCE = 'guidance',
  EXPERT = 'expert',
}

registerEnumType(VirtualContributorEngine, {
  name: 'VirtualContributorEngine',
});
