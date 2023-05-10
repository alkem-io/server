import { registerEnumType } from '@nestjs/graphql';

export enum CalloutType {
  CARD = 'card',
  CANVAS = 'canvas',
  COMMENTS = 'comments',
  LINK_COLLECTION = 'link-collection',
  SINGLE_WHITEBOARD = 'single-whiteboard',
}

registerEnumType(CalloutType, {
  name: 'CalloutType',
});
