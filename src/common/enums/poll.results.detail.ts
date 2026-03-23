import { registerEnumType } from '@nestjs/graphql';

export enum PollResultsDetail {
  PERCENTAGE = 'percentage',
  COUNT = 'count',
  FULL = 'full',
}

registerEnumType(PollResultsDetail, {
  name: 'PollResultsDetail',
  description: 'Controls the level of detail shown in poll results.',
  valuesMap: {
    PERCENTAGE: {
      description:
        'Only percentage per option; no vote counts or voter identities.',
    },
    COUNT: {
      description: 'Vote count per option; no voter identities.',
    },
    FULL: {
      description:
        'Counts and voter list per option — fully transparent (default).',
    },
  },
});
