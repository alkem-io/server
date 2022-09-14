import { registerEnumType } from '@nestjs/graphql';

export enum ActivityEventType {
  CALLOUT_PUBLISHED = 'callout-published',
  CARD_CREATED = 'card-created',
  CANVAS_CREATED = 'canvas-created',
  CARD_COMMENT = 'card-comment',
  DISCUSSION_COMMENT = 'discussion-comment',
  MEMBER_JOINED = 'member-joined',
}

registerEnumType(ActivityEventType, {
  name: 'ActivityEventType',
});
