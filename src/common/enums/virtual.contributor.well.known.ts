import { registerEnumType } from '@nestjs/graphql';

export enum VirtualContributorWellKnown {
  CHAT_GUIDANCE = 'CHAT_GUIDANCE',
  STEWARD_OWNERSHIP_EXPERT = 'STEWARD_OWNERSHIP_EXPERT',
}

registerEnumType(VirtualContributorWellKnown, {
  name: 'VirtualContributorWellKnown',
});
