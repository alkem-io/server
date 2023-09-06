import { registerEnumType } from '@nestjs/graphql';

export enum CalloutType {
  POST = 'post',
  POST_COLLECTION = 'post-collection',
  WHITEBOARD = 'whiteboard',
  WHITEBOARD_RT = 'whiteboard-real-time',
  WHITEBOARD_COLLECTION = 'whiteboard-collection',
  LINK_COLLECTION = 'link-collection',
}

registerEnumType(CalloutType, {
  name: 'CalloutType',
});
