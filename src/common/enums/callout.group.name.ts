import { registerEnumType } from '@nestjs/graphql';

export enum CalloutGroupName {
  HOME_1 = 'HOME_1',
  HOME_2 = 'HOME_2',
  COMMUNITY_1 = 'COMMUNITY_1',
  COMMUNITY_2 = 'COMMUNITY_2',
  CONTRIBUTE_1 = 'CONTRIBUTE_1',
  CONTRIBUTE_2 = 'CONTRIBUTE_2',
  KNOWLEDGE = 'KNOWLEDGE',
  SUBSPACES_1 = 'SUBSPACES_1',
  SUBSPACES_2 = 'SUBSPACES_2',
}

registerEnumType(CalloutGroupName, {
  name: 'CalloutGroupName',
});
