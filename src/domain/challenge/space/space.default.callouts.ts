import { CalloutDisplayLocation } from '@common/enums/callout.display.location';
import { CalloutState } from '@common/enums/callout.state';
import { CalloutType } from '@common/enums/callout.type';
import { CommonDisplayLocation } from '@common/enums/common.display.location';
import { SpaceDisplayLocation } from '@common/enums/space.display.location';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { TagsetType } from '@common/enums/tagset.type';
import { CreateCalloutInput } from '@domain/collaboration/callout';
import { EMPTY_WHITEBOARD_VALUE } from '@domain/common/whiteboard/whiteboard.entity';

export const spaceDefaultCallouts: CreateCalloutInput[] = [
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
    displayLocation: CalloutDisplayLocation.HOME_TOP,
  },
  {
    nameID: 'general-chat',
    type: CalloutType.POST,
    profile: {
      displayName: 'General chat 💬',
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
    type: CalloutType.POST,
    profile: {
      displayName: 'Do you have any questions or feedback?',
      description: 'Please share it here :)',
      tagsets: [
        {
          name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
          type: TagsetType.SELECT_ONE,
          tags: [CommonDisplayLocation.HOME_LEFT],
        },
      ],
    },
    nameID: 'questions',
    state: CalloutState.OPEN,
    sortOrder: 2,
    displayLocation: CalloutDisplayLocation.HOME_LEFT,
  },
  {
    type: CalloutType.WHITEBOARD,
    profile: {
      displayName: 'What is this Space about?',
      description: 'We can use this whiteboard to further define our mission and vision, who we want to involve, and what impact we want to make!',
      tagsets: [
        {
          name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
          type: TagsetType.SELECT_ONE,
          tags: [CommonDisplayLocation.HOME_RIGHT],
        },
      ],
    },
    nameID: 'vision',
    state: CalloutState.OPEN,
    sortOrder: 1,
    displayLocation: CalloutDisplayLocation.HOME_RIGHT,
  },
  {
    nameID: 'space-welcome',
    type: CalloutType.POST,
    profile: {
      displayName: 'Welcome to the community!',
      description:
        '👋 Please share a few words about yourself to help the community get to know each other. What brings you to this Space and motivates you to work on these Challenges?',
      tagsets: [
        {
          name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
          type: TagsetType.SELECT_ONE,
          tags: [SpaceDisplayLocation.COMMUNITY_LEFT],
        },
      ],
    },
    state: CalloutState.OPEN,
    sortOrder: 1,
    displayLocation: CalloutDisplayLocation.COMMUNITY_LEFT,
  },
  {
    type: CalloutType.WHITEBOARD,
    profile: {
      displayName: 'Understanding the existing and potential community',
      description: 'Choose one of the templates from the library to map our your ecosystem or stakeholders here!',
      tagsets: [
        {
          name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
          type: TagsetType.SELECT_ONE,
          tags: [CommonDisplayLocation.COMMUNITY_RIGHT],
        },
      ],
    },
    nameID: 'ecosystem',
    state: CalloutState.OPEN,
    sortOrder: 1,
    displayLocation: CalloutDisplayLocation.COMMUNITY_RIGHT,
  },
  {
    nameID: 'challenge-ideas',
    type: CalloutType.POST,
    profile: {
      displayName: 'What Challenges do you care about?',
      description:
        '👋 Please share any relevant Challenges that you encounter?',
      tagsets: [
        {
          name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
          type: TagsetType.SELECT_ONE,
          tags: [SpaceDisplayLocation.CHALLENGES_LEFT],
        },
      ],
    },
    state: CalloutState.OPEN,
    sortOrder: 1,
    displayLocation: CalloutDisplayLocation.CHALLENGES_LEFT,
  },
  {
    type: CalloutType.POST_COLLECTION,
    profile: {
      displayName: 'Challenge proposals 🎯',
      description:
        'Do you have a specific Challenge you would like to pick up in this Space, please share your proposal here? You can also comment on proposals by others if you want to work on that Challenge as well!',
      tagsets: [
        {
          name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
          type: TagsetType.SELECT_ONE,
          tags: [CommonDisplayLocation.CHALLENGES_RIGHT],
        },
      ],
    },
    nameID: `${CalloutType.POST_COLLECTION}-default`,
    state: CalloutState.OPEN,
    sortOrder: 1,
    postTemplate: {
      type: 'challenge',
      defaultDescription:
        'Describe your Challenge, what your vision is, and who you would like to involve.',
      profile: {
        displayName: 'Challenge',
        description:
          'To share proposals for challenges to be worked on.',
      },
    },
    displayLocation: CalloutDisplayLocation.CHALLENGES_RIGHT,
  },
  {
    type: CalloutType.POST_COLLECTION,
    profile: {
      displayName: 'Relevant news, research or use cases 📰',
      description:
        'Please share any relevant insights to help us better understand the context. You can describe why it is relevant and add a link or upload a document with the article. You can also comment on the insights already submitted by other community members!',
      tagsets: [
        {
          name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
          type: TagsetType.SELECT_ONE,
          tags: [CommonDisplayLocation.KNOWLEDGE],
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
    displayLocation: CalloutDisplayLocation.KNOWLEDGE,
  },
  {
    type: CalloutType.LINK_COLLECTION,
    profile: {
      displayName: 'Reference / important documents',
      description: 'Please add links to documents with reference material.💥',
      tagsets: [
        {
          name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
          type: TagsetType.SELECT_ONE,
          tags: [CommonDisplayLocation.KNOWLEDGE],
        },
      ],
    },
    nameID: 'documents',
    state: CalloutState.OPEN,
    sortOrder: 2,
  },
  {
    type: CalloutType.POST_COLLECTION,
    profile: {
      displayName: 'FAQ',
      description:
        'Do you have a question? Check out the most asked questions and answers here.',
      tagsets: [
        {
          name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
          type: TagsetType.SELECT_ONE,
          tags: [CommonDisplayLocation.KNOWLEDGE],
        },
      ],
    },
    nameID: `${CalloutType.POST_COLLECTION}-default`,
    state: CalloutState.OPEN,
    sortOrder: 3,
    postTemplate: {
      type: 'FAQ',
      defaultDescription:
        'Please share your question!',
      profile: {
        displayName: 'faq',
        description:
          'To gather questions from the community.',
      },
    },
    displayLocation: CalloutDisplayLocation.KNOWLEDGE,
  },
];