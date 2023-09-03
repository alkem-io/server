import { registerEnumType } from '@nestjs/graphql';

export enum CalloutResponseType {
  POST = 'post',
  WHITEBOARD = 'whiteboard',
  WHITEBOARD_RT = 'whiteboard-rt',
  LINK = 'link',
  COMMENTS = 'comments',
}

registerEnumType(CalloutResponseType, {
  name: 'CalloutResponseType',
});
