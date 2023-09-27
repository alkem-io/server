import { registerEnumType } from '@nestjs/graphql';

export enum CalloutDisplayLocation {
  HOME_LEFT = 'HOME_1',
  HOME_RIGHT = 'HOME_2',
  CONTRIBUTE_LEFT = 'CONTRIBUTE_1',
  CONTRIBUTE_RIGHT = 'CONTRIBUTE_2',
  KNOWLEDGE = 'KNOWLEDGE',
  COMMUNITY_LEFT = 'COMMUNITY_1',
  COMMUNITY_RIGHT = 'COMMUNITY_2',
  CHALLENGES_LEFT = 'CHALLENGES_1',
  CHALLENGES_RIGHT = 'CHALLENGES_2',
  OPPORTUNITIES_LEFT = 'OPPORTUNITIES_1',
  OPPORTUNITIES_RIGHT = 'OPPORTUNITIES_2',
}

registerEnumType(CalloutDisplayLocation, {
  name: 'CalloutDisplayLocation',
});
