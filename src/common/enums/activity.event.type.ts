import { registerEnumType } from '@nestjs/graphql';

export enum ActivityEventType {
  CALLOUT_PUBLISHED = 'callout-published',
  POST_CREATED = 'post-created',
  WHITEBOARD_CREATED = 'whiteboard-created',
  POST_COMMENT = 'post-comment',
  DISCUSSION_COMMENT = 'discussion-comment',
  UPDATE_SENT = 'update-sent',
  MEMBER_JOINED = 'member-joined',
  CHALLENGE_CREATED = 'challenge-created',
  OPPORTUNITY_CREATED = 'opportunity-created',
}

registerEnumType(ActivityEventType, {
  name: 'ActivityEventType',
});
