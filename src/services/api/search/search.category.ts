import { registerEnumType } from '@nestjs/graphql';

export enum SearchCategory {
  SPACES = 'spaces',
  COLLABORATION_TOOLS = 'collaboration-tools',
  FRAMINGS = 'framings',
  CONTRIBUTIONS = 'contributions',
  CONTRIBUTORS = 'contributors',
}

registerEnumType(SearchCategory, {
  name: 'SearchCategory',
  description:
    'The category in which to search. A category may include a couple of entity types, e.g. "contributions" include posts, whiteboard, etc.',
});
