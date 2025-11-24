import { registerEnumType } from '@nestjs/graphql';

export enum CalloutContributionType {
  POST = 'post',
  WHITEBOARD = 'whiteboard',
  POLL = 'poll',
  LINK = 'link',
  MEMO = 'memo',
}

registerEnumType(CalloutContributionType, {
  name: 'CalloutContributionType',
});

export const AllCalloutContributionTypes = [
  CalloutContributionType.POST,
  CalloutContributionType.WHITEBOARD,
  CalloutContributionType.POLL,
  CalloutContributionType.LINK,
  CalloutContributionType.MEMO,
] as const;
