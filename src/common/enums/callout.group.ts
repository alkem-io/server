import { registerEnumType } from '@nestjs/graphql';

export enum CalloutGroup {
  KNOWLEDGE_GROUP_1 = 'knowledge_group_1',
  KNOWLEDGE_GROUP_2 = 'knowledge_group_2',
  DASHBOARD_GROUP_1 = 'dashboard_group_1',
  DASHBOARD_GROUP_2 = 'dashboard_group_2',
  CHALLENGES_GROUP_1 = 'challenges_group_1',
  CHALLENGES_GROUP_2 = 'challenges_group_2',
  COMMUNITY_GROUP_1 = 'community_group_1',
  COMMUNITY_GROUP_2 = 'community_group_2',
}

registerEnumType(CalloutGroup, {
  name: 'CalloutGroup',
});
