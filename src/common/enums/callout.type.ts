import { registerEnumType } from '@nestjs/graphql';

export enum CalloutType {
  POST = 'post',
  POST_COLLECTION = 'post-collection',
  WHITEBOARD = 'whiteboard',
  WHITEBOARD_COLLECTION = 'whiteboard-collection',
  LINK_COLLECTION = 'link-collection',
  MEMBER_GUIDELINES = 'member-guidelines',
}

registerEnumType(CalloutType, {
  name: 'CalloutType',
});
