import { registerEnumType } from '@nestjs/graphql';

export enum ActivityEventType {
  CALLOUT_PUBLISHED = 'callout-published',
  CALLOUT_POST_CREATED = 'post-created',
  CALLOUT_POST_COMMENT = 'post-comment',
  CALLOUT_WHITEBOARD_CREATED = 'whiteboard-created',
  CALLOUT_WHITEBOARD_CONTENT_MODIFIED = 'whiteboard-content-modified',
  CALLOUT_LINK_CREATED = 'callout-link-added',
  DISCUSSION_COMMENT = 'discussion-comment',
  UPDATE_SENT = 'update-sent',
  MEMBER_JOINED = 'member-joined',
  CHALLENGE_CREATED = 'challenge-created',
  OPPORTUNITY_CREATED = 'opportunity-created',
  CALENDAR_EVENT_CREATED = 'calendar-event-created',
}

registerEnumType(ActivityEventType, {
  name: 'ActivityEventType',
});
