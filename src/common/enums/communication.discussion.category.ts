import { registerEnumType } from '@nestjs/graphql';
import { DiscussionCategoryCommunity } from './communication.discussion.category.community';
import { DiscussionCategoryPlatform } from './communication.discussion.category.platform';

export const DiscussionCategory = {
  ...DiscussionCategoryCommunity,
  ...DiscussionCategoryPlatform,
};

export type DiscussionCategory =
  | DiscussionCategoryCommunity
  | DiscussionCategoryPlatform;

registerEnumType(DiscussionCategory, {
  name: 'DiscussionCategory',
});
