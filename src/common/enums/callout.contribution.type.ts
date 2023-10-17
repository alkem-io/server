import { registerEnumType } from '@nestjs/graphql';

export enum CalloutContributionType {
  POST = 'post',
  WHITEBOARD = 'whiteboard',
  LINK = 'link',
}

registerEnumType(CalloutContributionType, {
  name: 'CalloutContributionType',
});
