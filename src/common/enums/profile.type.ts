import { registerEnumType } from '@nestjs/graphql';

export enum ProfileType {
  SPACE = 'space',
  CHALLENGE = 'challenge',
  OPPORTUNITY = 'opportunity',
  INNOVATION_FLOW = 'innovation-flow',
  CALLOUT_TEMPLATE = 'callout-template',
  CALLOUT_FRAMING = 'callout-framing',
  POST = 'post',
  CONTRIBUTION_LINK = 'contribution-link',
  WHITEBOARD = 'whiteboard',
  DISCUSSION = 'discussion',
  ORGANIZATION = 'organization',
  USER_GROUP = 'user-group',
  USER = 'user',
  INNOVATION_HUB = 'innovation-hub',
  CALENDAR_EVENT = 'calendar-event',
  INNOVATION_PACK = 'innovation-pack',
  INNOVATION_FLOW_TEMPLATE = 'innovation-flow-template',
  POST_TEMPLATE = 'post-template',
  WHITEBOARD_TEMPLATE = 'whiteboard-template',
  MEMBER_GUIDELINES_TEMPLATE = 'member-guidelines-template',
  COMMUNITY_GUIDELINES = 'community-guidelines',
  VIRTUAL_CONTRIBUTOR = 'virtual-contributor',
  VIRTUAL_PERSONA = 'virtual-persona',
}

registerEnumType(ProfileType, {
  name: 'ProfileType',
});
