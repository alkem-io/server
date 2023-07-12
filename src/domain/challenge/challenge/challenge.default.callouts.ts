import { CalloutState } from '@common/enums/callout.state';
import { CalloutType } from '@common/enums/callout.type';
import { ChallengeDisplayLocation } from '@common/enums/challenge.display.location';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { CreateCalloutInput } from '@domain/collaboration/callout';
import { EMPTY_WHITEBOARD_VALUE } from '@domain/common/whiteboard/whiteboard.entity';

export const challengeDefaultCallouts: CreateCalloutInput[] = [
  {
    type: CalloutType.POST,
    profile: {
      displayName: 'Why do you care about this Challenge?',
      description:
        '👋 Please share a few words about yourself to help the community get to know each other. For example, why is this Challenge important to you, or relevant thoughts, experience or expertise.',
      tagsets: [
        {
          name: TagsetReservedName.DISPLAY_LOCATION_CHALLENGE,
          tags: [ChallengeDisplayLocation.HOME_LEFT],
        },
      ],
    },
    nameID: 'challenge-welcome',
    state: CalloutState.OPEN,
    sortOrder: 1,
  },
  {
    type: CalloutType.LINK_COLLECTION,
    profile: {
      displayName: 'Recommended by the Leads',
      description: 'Some quick links to get started 💥',
      tagsets: [
        {
          name: TagsetReservedName.DISPLAY_LOCATION_CHALLENGE,
          tags: [ChallengeDisplayLocation.HOME_TOP],
        },
      ],
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
      tagsets: [
        {
          name: TagsetReservedName.DISPLAY_LOCATION_CHALLENGE,
          tags: [ChallengeDisplayLocation.HOME_RIGHT],
        },
      ],
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
      tagsets: [
        {
          name: TagsetReservedName.DISPLAY_LOCATION_CHALLENGE,
          tags: [ChallengeDisplayLocation.CONTRIBUTE_RIGHT],
        },
      ],
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
        'Collaborate visually using Whiteboards. Create a new Whiteboard from a template, or explore Whiteboards already created.',
    },
    nameID: `${CalloutType.WHITEBOARD_COLLECTION}`,
    state: CalloutState.OPEN,
    sortOrder: 10,
    whiteboardTemplate: {
      value: EMPTY_WHITEBOARD_VALUE,
      profile: {
        displayName: 'blank whiteboard',
        description: 'A blank whiteboard to be worked further.',
        tagsets: [
          {
            name: TagsetReservedName.DISPLAY_LOCATION_CHALLENGE,
            tags: [ChallengeDisplayLocation.CONTRIBUTE],
          },
        ],
      },
    },
  },
];
