import { registerEnumType } from '@nestjs/graphql';

export enum VirtualContributorWellKnown {
  GUIDANCE = 'guidance',
}

registerEnumType(VirtualContributorWellKnown, {
  name: 'VirtualContributorWellKnown',
});
