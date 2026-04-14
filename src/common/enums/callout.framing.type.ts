import { registerEnumType } from '@nestjs/graphql';

export enum CalloutFramingType {
  NONE = 'none',
  WHITEBOARD = 'whiteboard',
  LINK = 'link',
  MEMO = 'memo',
  MEDIA_GALLERY = 'media_gallery',
  POLL = 'poll',
  COLLABORA_DOCUMENT = 'collabora_document',
}

registerEnumType(CalloutFramingType, {
  name: 'CalloutFramingType',
});
