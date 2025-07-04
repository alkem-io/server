import { registerEnumType } from '@nestjs/graphql';

/**
 * @deprecated Do not use this. Maintained for the notifications, but this enum should be removed in the future.
 */
export enum CalloutType {
  POST = 'post',
  POST_COLLECTION = 'post-collection',
  WHITEBOARD = 'whiteboard',
  WHITEBOARD_COLLECTION = 'whiteboard-collection',
  LINK_COLLECTION = 'link-collection',
}

registerEnumType(CalloutType, {
  name: 'CalloutType',
});
