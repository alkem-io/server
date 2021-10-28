import { registerEnumType } from '@nestjs/graphql';

export enum CommunityType {
  HUB = 'hub',
  CHALLENGE = 'challenge',
  OPPORTUNITY = 'opportunity',
}

registerEnumType(CommunityType, {
  name: 'CommunityType',
});
