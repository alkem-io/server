import { registerEnumType } from '@nestjs/graphql';

export enum ContributionType {
  POST = 'post',
  WHITEBOARD = 'whiteboard',
  LINK = 'link',
}

registerEnumType(ContributionType, {
  name: 'ContributionType',
});
