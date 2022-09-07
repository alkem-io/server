import { registerEnumType } from '@nestjs/graphql';

export enum CalloutType {
  CARD = 'card',
  CANVAS = 'canvas',
  COMMENTS = 'comments',
}

registerEnumType(CalloutType, {
  name: 'CalloutType',
});
