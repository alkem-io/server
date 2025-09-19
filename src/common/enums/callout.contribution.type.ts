import { registerEnumType } from '@nestjs/graphql';

export enum CalloutContributionType {
  POST = 'post',
  WHITEBOARD = 'whiteboard',
  LINK = 'link',
  MEMO = 'memo',
}

registerEnumType(CalloutContributionType, {
  name: 'CalloutContributionType',
});

export const AllCalloutContributionTypes = [
  CalloutContributionType.POST,
  CalloutContributionType.WHITEBOARD,
  CalloutContributionType.LINK,
  CalloutContributionType.MEMO,
] as const;
