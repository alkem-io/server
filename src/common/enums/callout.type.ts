import { registerEnumType } from '@nestjs/graphql';

export enum CalloutType {
  CARD = 'card',
  CANVAS = 'canvas',
  DISCUSSION = 'discussion',
}

registerEnumType(CalloutType, {
  name: 'CalloutType',
});
