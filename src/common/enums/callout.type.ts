import { registerEnumType } from '@nestjs/graphql';

export enum CalloutType {
  CARD = 'card',
  CANVAS = 'canvas',
  COMMENTS = 'comments',
  LINK_COLLECTION = 'link-collection',
}

registerEnumType(CalloutType, {
  name: 'CalloutType',
});
