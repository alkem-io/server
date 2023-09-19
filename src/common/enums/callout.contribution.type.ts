import { registerEnumType } from '@nestjs/graphql';

export enum CalloutContributionType {
  POST = 'post',
  WHITEBOARD = 'whiteboard',
  WHITEBOARD_RT = 'whiteboard-rt',
  LINK = 'link',
  COMMENTS = 'comments',
}

registerEnumType(CalloutContributionType, {
  name: 'CalloutContributionType',
});
