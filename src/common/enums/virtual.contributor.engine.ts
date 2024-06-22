import { registerEnumType } from '@nestjs/graphql';

export enum VirtualContributorEngine {
  GUIDANCE = 'guidance',
  EXPERT = 'expert',
  COMMUNITY_MANAGER = 'community-manager',
}

registerEnumType(VirtualContributorEngine, {
  name: 'VirtualContributorEngine',
});
