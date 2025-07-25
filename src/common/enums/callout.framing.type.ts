import { registerEnumType } from '@nestjs/graphql';

export enum CalloutFramingType {
  NONE = 'none',
  WHITEBOARD = 'whiteboard',
  MEMO = 'memo',
}

registerEnumType(CalloutFramingType, {
  name: 'CalloutFramingType',
});
