import { registerEnumType } from '@nestjs/graphql';

export enum CalloutType {
  POST = 'post',
  WHITEBOARD = 'whiteboard',
  COMMENTS = 'comments',
  LINK_COLLECTION = 'link-collection',
  SINGLE_WHITEBOARD = 'single-whiteboard',
}

registerEnumType(CalloutType, {
  name: 'CalloutType',
});
