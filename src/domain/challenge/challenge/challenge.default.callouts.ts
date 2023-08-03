import { CalloutState } from '@common/enums/callout.state';
import { CalloutType } from '@common/enums/callout.type';
import { ChallengeDisplayLocation } from '@common/enums/challenge.display.location';
import { CommonDisplayLocation } from '@common/enums/common.display.location';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { TagsetType } from '@common/enums/tagset.type';
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
          name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
          type: TagsetType.SELECT_ONE,
          tags: [CommonDisplayLocation.HOME_LEFT],
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
          name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
          type: TagsetType.SELECT_ONE,
          tags: [CommonDisplayLocation.HOME_TOP],
        },
      ],
    },
    nameID: 'recommendations',
    state: CalloutState.CLOSED,
    sortOrder: 3,
  },
  {
    nameID: 'general-chat',
    type: CalloutType.POST,
    profile: {
      displayName: 'General chat',
      description: 'Things you would like to discuss with the community?',
      tagsets: [
        {
          name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
          type: TagsetType.SELECT_ONE,
          tags: [SpaceDisplayLocation.HOME_LEFT],
        },
      ],
    },
    state: CalloutState.OPEN,
    sortOrder: 1,
    displayLocation: CalloutDisplayLocation.HOME_LEFT,
  },
  {
    type: CalloutType.POST_COLLECTION,
    profile: {
      displayName: 'Contribute',
      description:
        '✍️ Contribute your insights to understanding the context. It is about surfacing up the wisdom of the community. Add your own post, or comment on posts added by others.',
      tagsets: [
        {
          name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
          type: TagsetType.SELECT_ONE,
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
        '✍️ Please share your contribution. The more details the better!',
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
        '🎨 Collaborate visually using Whiteboards. Create a new Whiteboard from a template, or explore Whiteboards already created.',
      tagsets: [
        {
          name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
          type: TagsetType.SELECT_ONE,
          tags: [ChallengeDisplayLocation.CONTRIBUTE],
        },
      ],
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
  {
    nameID: 'opportunity-ideas',
    type: CalloutType.POST,
    profile: {
      displayName: 'What Opportunities do you see?',
      description:
        '👋 Please share any relevant direction for a solution that you can think of or have seen?',
      tagsets: [
        {
          name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
          type: TagsetType.SELECT_ONE,
          tags: [SpaceDisplayLocation.OPPORTUNITIES_LEFT],
        },
      ],
    },
    state: CalloutState.OPEN,
    sortOrder: 1,
    displayLocation: CalloutDisplayLocation.OPPORTUNITIES_LEFT,
  },
  {
    type: CalloutType.POST_COLLECTION,
    profile: {
      displayName: 'Opportunity proposals 🎯',
      description:
        'Do you have a specific Opportunity you would like to pick up with other community members? Please share your proposal here! You can also comment on proposals by others if you want to work on that Opportunity as well!',
      tagsets: [
        {
          name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
          type: TagsetType.SELECT_ONE,
          tags: [CommonDisplayLocation.OPPORTUNITIES_RIGHT],
        },
      ],
    },
    nameID: `${CalloutType.POST_COLLECTION}-default`,
    state: CalloutState.OPEN,
    sortOrder: 1,
    postTemplate: {
      type: 'contribution',
      defaultDescription:
        '✍️ Please share your contribution. The more details the better!',
      profile: {
        displayName: 'contribution',
        description:
          'To share contributions with detailed explanations how they help.',
      },
    },
    displayLocation: CalloutDisplayLocation.OPPORTUNITIES_RIGHT,
  },
];
