import { registerEnumType } from '@nestjs/graphql';

export enum ProfileType {
  SPACE_ABOUT = 'space-about',
  INNOVATION_FLOW = 'innovation-flow',
  CALLOUT_FRAMING = 'callout-framing',
  KNOWLEDGE_BASE = 'knowledge-base',
  POST = 'post',
  CONTRIBUTION_LINK = 'contribution-link',
  WHITEBOARD = 'whiteboard',
  MEMO = 'memo',
  DISCUSSION = 'discussion',
  ORGANIZATION = 'organization',
  USER_GROUP = 'user-group',
  USER = 'user',
  INNOVATION_HUB = 'innovation-hub',
  CALENDAR_EVENT = 'calendar-event',
  INNOVATION_PACK = 'innovation-pack',
  TEMPLATE = 'template',
  COMMUNITY_GUIDELINES = 'community-guidelines',
  VIRTUAL_CONTRIBUTOR = 'virtual-contributor',
  VIRTUAL_PERSONA = 'virtual-persona',
  SPACE = 'space',
  ACCOUNT = 'account',
}

registerEnumType(ProfileType, {
  name: 'ProfileType',
});
