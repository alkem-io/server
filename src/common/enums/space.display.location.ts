import { registerEnumType } from '@nestjs/graphql';

export enum SpaceDisplayLocation {
  HOE_TOP = 'HOME_0',
  HOME_LEFT = 'HOME_1',
  HOME_RIGHT = 'HOME_2',
  COMMUNITY_LEFT = 'COMMUNITY_1',
  COMMUNITY_RIGHT = 'COMMUNITY_2',
  CHALLENGES_LEFT = 'CHALLENGES_1',
  CHALLENGES_RIGHT = 'CHALLENGES_2',
  KNOWEDGE_RIGHT = 'KNOWLEDGE',
}

registerEnumType(SpaceDisplayLocation, {
  name: 'SpaceDisplayLocation',
});
