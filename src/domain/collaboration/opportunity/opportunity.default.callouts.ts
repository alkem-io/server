import { CalloutState } from '@common/enums/callout.state';
import { CalloutType } from '@common/enums/callout.type';
import { CreateCalloutInput } from '@domain/collaboration/callout';
import { EMPTY_WHITEBOARD_VALUE } from '@domain/common/whiteboard/whiteboard.entity';

export const opportunityDefaultCallouts: CreateCalloutInput[] = [
  {
    type: CalloutType.LINK_COLLECTION,
    profile: {
      displayName: 'Recommended by the Host',
      description: 'Please find below quick start links.',
    },
    nameID: 'recommendations',
    state: CalloutState.CLOSED,
    sortOrder: 3,
  },
  {
    type: CalloutType.POST,
    profile: {
      displayName: 'Suggestions, Questions, and Feedback',
      description: 'Please share it here :)',
    },
    nameID: 'suggestions',
    state: CalloutState.OPEN,
    sortOrder: 3,
  },
  {
    type: CalloutType.POST_COLLECTION,
    profile: {
      displayName: 'Contribute',
      description:
        'Contribute your insights to understanding the context. It is about surfacing up the wisdom of the community. Add your own post, or comment on posts added by others.',
    },
    nameID: `${CalloutType.POST_COLLECTION}-default`,
    state: CalloutState.OPEN,
    sortOrder: 5,
    postTemplate: {
      type: 'contribution',
      defaultDescription:
        'Please share your contribution. The more details the better!',
      profile: {
        displayName: 'contribution',
        description:
          'To share contributions with detailed explanations how they help.',
      },
    },
  },
  {
    type: CalloutType.WHITEBOARD_COLLECTION,
    profile: {
      displayName: 'Collaborate visually',
      description:
        'Collaborate visually using Whiteboardes. Create a new Whiteboard from a template, or explore Whiteboardes already created.',
    },
    nameID: `${CalloutType.WHITEBOARD_COLLECTION}`,
    state: CalloutState.OPEN,
    sortOrder: 10,
    whiteboardTemplate: {
      value: EMPTY_WHITEBOARD_VALUE,
      profile: {
        displayName: 'blank whiteboard',
        description: 'A blank whiteboard to be worked further.',
      },
    },
  },
];
