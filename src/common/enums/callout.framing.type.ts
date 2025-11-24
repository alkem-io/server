import { registerEnumType } from '@nestjs/graphql';

export enum CalloutFramingType {
  NONE = 'none',
  WHITEBOARD = 'whiteboard',
  POLL = 'poll',
  LINK = 'link',
  MEMO = 'memo',
}

registerEnumType(CalloutFramingType, {
  name: 'CalloutFramingType',
});
