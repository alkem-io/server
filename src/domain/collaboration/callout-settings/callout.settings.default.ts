import { CalloutAllowedActors } from '@common/enums/callout.allowed.contributors';
import { CalloutVisibility } from '@common/enums/callout.visibility';

export const DefaultCalloutSettings = {
  framing: {
    commentsEnabled: true,
  },
  contribution: {
    enabled: false,
    canAddContributions: CalloutAllowedActors.MEMBERS,
    allowedTypes: [],
    commentsEnabled: true,
  },
  visibility: CalloutVisibility.PUBLISHED,
};
