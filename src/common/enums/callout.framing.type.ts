import { registerEnumType } from '@nestjs/graphql';

export enum CalloutFramingType {
  NONE = 'none',
  WHITEBOARD = 'whiteboard',
  LINK = 'link',
}

registerEnumType(CalloutFramingType, {
  name: 'CalloutFramingType',
});
