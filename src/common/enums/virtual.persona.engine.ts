import { registerEnumType } from '@nestjs/graphql';

export enum VirtualContributorEngine {
  GUIDANCE = 'guidance',
  COMMUNITY_MANAGER = 'community-manager',
  EXPERT = 'expert',
  ALKEMIO_WELCOME = 'alkemio-welcome',
}

registerEnumType(VirtualContributorEngine, {
  name: 'VirtualContributorEngine',
});
