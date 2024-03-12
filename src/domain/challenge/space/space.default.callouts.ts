import { CalloutState } from '@common/enums/callout.state';
import { CalloutType } from '@common/enums/callout.type';
import { CommonDisplayLocation } from '@domain/challenge/space.defaults/definitions/common.display.location';
import { SpaceDisplayLocation } from '@domain/challenge/space.defaults/definitions/space.display.location';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { TagsetType } from '@common/enums/tagset.type';
import { CreateCalloutInput } from '@domain/collaboration/callout';
import { EMPTY_WHITEBOARD_CONTENT } from '@domain/common/whiteboard/empty.whiteboard.content';

export const spaceDefaultCallouts: CreateCalloutInput[] = [
  {
    nameID: 'getting-started',
    type: CalloutType.LINK_COLLECTION,
    contributionPolicy: {
      state: CalloutState.CLOSED,
    },
    sortOrder: 1,
    framing: {
      profile: {
        displayName: 'Getting Started',
        description: '⬇️ Here are some quick links to help you get started',
        tagsets: [
          {
            name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
            type: TagsetType.SELECT_ONE,
            tags: [CommonDisplayLocation.HOME_RIGHT],
          },
        ],
      },
    },
  },
  {
    nameID: 'general-chat',
    type: CalloutType.POST,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 1,
    framing: {
      profile: {
        displayName: 'General chat 💬',
        description: 'Things you would like to discuss with the community?',
        tagsets: [
          {
            name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
            type: TagsetType.SELECT_ONE,
            tags: [CommonDisplayLocation.HOME_LEFT],
          },
        ],
      },
    },
  },
  {
    nameID: 'questions',
    type: CalloutType.POST,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 2,
    framing: {
      profile: {
        displayName: 'Any questions or feedback?',
        description: 'Please share it here :)',
        tagsets: [
          {
            name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
            type: TagsetType.SELECT_ONE,
            tags: [CommonDisplayLocation.HOME_LEFT],
          },
        ],
      },
    },
  },
  {
    nameID: 'vision',
    type: CalloutType.WHITEBOARD,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 2,
    framing: {
      profile: {
        displayName: 'What is this Space about?',
        description:
          'We can use this whiteboard to further define our mission and vision, who we want to involve, and what impact we want to make!',
        tagsets: [
          {
            name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
            type: TagsetType.SELECT_ONE,
            tags: [CommonDisplayLocation.HOME_RIGHT],
          },
        ],
      },
      whiteboard: {
        content: EMPTY_WHITEBOARD_CONTENT,
        nameID: 'vision',
        profileData: {
          displayName: 'Vision',
        },
      },
    },
  },
  {
    nameID: 'space-welcome',
    type: CalloutType.POST,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 1,
    framing: {
      profile: {
        displayName: 'Welcome to the community!',
        description:
          '👋 Do you have any suggestions or ideas to grow the community and our impact? Please share!',
        tagsets: [
          {
            name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
            type: TagsetType.SELECT_ONE,
            tags: [SpaceDisplayLocation.COMMUNITY_LEFT],
          },
        ],
      },
    },
  },
  {
    nameID: 'ecosystem',
    type: CalloutType.WHITEBOARD,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 1,
    framing: {
      profile: {
        displayName: 'Understanding the existing and potential community',
        description:
          'Choose one of the templates from the library to map our your ecosystem or stakeholders here!',
        tagsets: [
          {
            name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
            type: TagsetType.SELECT_ONE,
            tags: [SpaceDisplayLocation.COMMUNITY_RIGHT],
          },
        ],
      },
      whiteboard: {
        content: EMPTY_WHITEBOARD_CONTENT,
        nameID: 'ecosystem',
        profileData: {
          displayName: 'Ecosystem Value Map',
        },
      },
    },
  },
  {
    nameID: 'challenge-ideas',
    type: CalloutType.POST,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 1,
    framing: {
      profile: {
        displayName: '🚩 What Challenges do you care about?',
        description: 'Please share any relevant Challenges that you encounter.',
        tagsets: [
          {
            name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
            type: TagsetType.SELECT_ONE,
            tags: [SpaceDisplayLocation.CHALLENGES_LEFT],
          },
        ],
      },
    },
  },
  {
    nameID: 'proposals',
    type: CalloutType.POST_COLLECTION,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 1,
    framing: {
      profile: {
        displayName: 'Challenge proposals',
        description:
          'What are the 🚩Challenges that you think we should be working on? Please add them below and use the template provided.',
        tagsets: [
          {
            name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
            type: TagsetType.SELECT_ONE,
            tags: [SpaceDisplayLocation.CHALLENGES_RIGHT],
          },
        ],
      },
    },
    contributionDefaults: {
      postDescription:
        'Title: <p> Description: <p> Who to involve: <p> Why is this important:',
    },
  },
  {
    nameID: 'news',
    type: CalloutType.POST_COLLECTION,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 1,
    framing: {
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
    },
    contributionDefaults: {
      postDescription:
        '✍️ Please share your contribution. The more details the better!',
    },
  },
  {
    nameID: 'documents',
    type: CalloutType.LINK_COLLECTION,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 2,
    framing: {
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
    },
  },
  {
    nameID: 'faq',
    type: CalloutType.POST_COLLECTION,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 3,
    framing: {
      profile: {
        displayName: '❓ FAQ',
        description:
          'Below you will find various questions and answers on this topic. Please feel invited to join in and share your answers as well!',
        tagsets: [
          {
            name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
            type: TagsetType.SELECT_ONE,
            tags: [CommonDisplayLocation.KNOWLEDGE],
          },
        ],
      },
    },
    contributionDefaults: {
      postDescription: 'Please share your question!',
    },
  },
];
