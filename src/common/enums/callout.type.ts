import { registerEnumType } from '@nestjs/graphql';

export enum CalloutType {
  CARD = 'Card',
  CANVAS = 'Canvas',
  DISCUSSION = 'Discussion',
}

registerEnumType(CalloutType, {
  name: 'CalloutType',
});
