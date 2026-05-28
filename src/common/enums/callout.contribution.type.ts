import { registerEnumType } from '@nestjs/graphql';

export enum CalloutContributionType {
  POST = 'post',
  WHITEBOARD = 'whiteboard',
  LINK = 'link',
  MEMO = 'memo',
  COLLABORA_DOCUMENT = 'collabora_document',
}

registerEnumType(CalloutContributionType, {
  name: 'CalloutContributionType',
});

export const AllCalloutContributionTypes = [
  CalloutContributionType.POST,
  CalloutContributionType.WHITEBOARD,
  CalloutContributionType.LINK,
  CalloutContributionType.MEMO,
  CalloutContributionType.COLLABORA_DOCUMENT,
] as const;
