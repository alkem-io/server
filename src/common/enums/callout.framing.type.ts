import { registerEnumType } from '@nestjs/graphql';

export enum CalloutFramingType {
  NONE = 'none',
  WHITEBOARD = 'whiteboard',
  LINK = 'link',
  MEMO = 'memo',
  MEDIA_GALLERY = 'media_gallery',
}

registerEnumType(CalloutFramingType, {
  name: 'CalloutFramingType',
});
