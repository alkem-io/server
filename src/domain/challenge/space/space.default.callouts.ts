import { CalloutState } from '@common/enums/callout.state';
import { CalloutType } from '@common/enums/callout.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { CreateCalloutInput } from '@domain/collaboration/callout';
import { EMPTY_WHITEBOARD_VALUE } from '@domain/common/whiteboard/whiteboard.entity';
import { SpaceDisplayLocation } from '@src/migrations/1688193761861-classificationTagsets';

export const spaceDefaultCallouts: CreateCalloutInput[] = [
  {
    nameID: 'space-welcome',
    type: CalloutType.POST,
    profile: {
      displayName: 'Welcome to the community!',
      description:
        '👋 Please share a few words about yourself to help the community get to know each other. What brings you to this Space and motivates you to work on these Challenges?',
      tagsets: [
        {
          name: TagsetReservedName.DISPLAY_LOCATION_SPACE,
          tags: [SpaceDisplayLocation.COMMUNITY_LEFT],
        },
      ],
    },
    state: CalloutState.OPEN,
    sortOrder: 1,
    group: 'COMMUNITY_1',
  },
  {
    type: CalloutType.LINK_COLLECTION,
    profile: {
      displayName: 'Recommended by the Leads',
      description: 'Some quick links to get started 💥',
      tagsets: [
        {
          name: TagsetReservedName.DISPLAY_LOCATION_SPACE,
          tags: [SpaceDisplayLocation.HOME_TOP],
        },
      ],
    },
    nameID: 'recommendations',
    state: CalloutState.CLOSED,
    sortOrder: 3,
    group: 'HOME_0',
  },
  {
    type: CalloutType.POST,
    profile: {
      displayName: 'Suggestions, Questions, and Feedback',
      description: 'Please share it here :)',
      tagsets: [
        {
          name: TagsetReservedName.DISPLAY_LOCATION_SPACE,
          tags: [SpaceDisplayLocation.HOME_RIGHT],
        },
      ],
    },
    nameID: 'suggestions',
    state: CalloutState.OPEN,
    sortOrder: 3,
    group: 'HOME_2',
  },
  {
    type: CalloutType.POST_COLLECTION,
    profile: {
      displayName: 'Contribute',
      description:
        '✍️ Contribute your insights to understanding the context. It is about surfacing up the wisdom of the community. Add your own post, or comment on posts added by others.',
      tagsets: [
        {
          name: TagsetReservedName.DISPLAY_LOCATION_SPACE,
          tags: [SpaceDisplayLocation.KNOWEDGE_RIGHT],
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
    group: 'KNOWLEDGE',
  },
  {
    type: CalloutType.LINK_COLLECTION,
    profile: {
      displayName: 'Reference / relevant documents',
      description: 'Please add links to documents with reference material.💥',
      tagsets: [
        {
          name: TagsetReservedName.DISPLAY_LOCATION_CHALLENGE,
          tags: [SpaceDisplayLocation.KNOWEDGE_RIGHT],
        },
      ],
    },
    nameID: 'documents',
    state: CalloutState.OPEN,
    sortOrder: 3,
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
            name: TagsetReservedName.DISPLAY_LOCATION_SPACE,
            tags: [SpaceDisplayLocation.KNOWEDGE_RIGHT],
          },
        ],
      },
    },
    group: 'KNOWLEDGE',
  },
];
