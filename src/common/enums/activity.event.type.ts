import { registerEnumType } from '@nestjs/graphql';

export enum ActivityEventType {
  CALLOUT_PUBLISHED = 'callout-published',
  CARD_CREATED = 'card-created',
  CANVAS_CREATED = 'canvas-created',
  CARD_COMMENT = 'card-comment',
  DISCUSSION_COMMENT = 'discussion-comment',
  UPDATE_SENT = 'update-sent',
  MEMBER_JOINED = 'member-joined',
  CHALLENGE_CREATED = 'challenge-created',
  OPPORTUNITY_CREATED = 'opportunity-created',
}

registerEnumType(ActivityEventType, {
  name: 'ActivityEventType',
});
