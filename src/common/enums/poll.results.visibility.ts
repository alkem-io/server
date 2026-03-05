import { registerEnumType } from '@nestjs/graphql';

export enum PollResultsVisibility {
  HIDDEN = 'hidden',
  TOTAL_ONLY = 'total-only',
  VISIBLE = 'visible',
}

registerEnumType(PollResultsVisibility, {
  name: 'PollResultsVisibility',
  description: 'Controls when poll results become visible to voters.',
  valuesMap: {
    HIDDEN: {
      description: 'Results hidden until the viewer has cast their own vote.',
    },
    TOTAL_ONLY: {
      description:
        'Only the total vote count is shown before voting; full detail after voting.',
    },
    VISIBLE: {
      description:
        'Full results always visible regardless of whether the viewer has voted (default).',
    },
  },
});
