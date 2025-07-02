import { registerEnumType } from '@nestjs/graphql';

export enum CalloutFramingType {
  NONE = 'none',
  WHITEBOARD = 'whiteboard',
}

registerEnumType(CalloutFramingType, {
  name: 'CalloutFramingType',
});
