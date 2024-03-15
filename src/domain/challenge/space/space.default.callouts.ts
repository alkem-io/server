import { CalloutState } from '@common/enums/callout.state';
import { CalloutType } from '@common/enums/callout.type';
import { SpaceCalloutGroup } from '@domain/challenge/space.defaults/definitions/space.callout.group';
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
    groupName: SpaceCalloutGroup.HOME_RIGHT,
    framing: {
      profile: {
        displayName: 'Getting Started',
        description: '⬇️ Here are some quick links to help you get started',
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
    groupName: SpaceCalloutGroup.HOME_LEFT,
    framing: {
      profile: {
        displayName: 'General chat 💬',
        description: 'Things you would like to discuss with the community?',
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
    groupName: SpaceCalloutGroup.HOME_LEFT,
    framing: {
      profile: {
        displayName: 'Any questions or feedback?',
        description: 'Please share it here :)',
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
    groupName: SpaceCalloutGroup.HOME_RIGHT,
    framing: {
      profile: {
        displayName: 'What is this Space about?',
        description:
          'We can use this whiteboard to further define our mission and vision, who we want to involve, and what impact we want to make!',
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
    groupName: SpaceCalloutGroup.COMMUNITY_LEFT,
    framing: {
      profile: {
        displayName: 'Welcome to the community!',
        description:
          '👋 Do you have any suggestions or ideas to grow the community and our impact? Please share!',
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
    groupName: SpaceCalloutGroup.COMMUNITY_RIGHT,
    framing: {
      profile: {
        displayName: 'Understanding the existing and potential community',
        description:
          'Choose one of the templates from the library to map our your ecosystem or stakeholders here!',
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
    groupName: SpaceCalloutGroup.SUBSPACES_LEFT,
    framing: {
      profile: {
        displayName: '🚩 What Challenges do you care about?',
        description: 'Please share any relevant Challenges that you encounter.',
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
    groupName: SpaceCalloutGroup.SUBSPACES_RIGHT,
    framing: {
      profile: {
        displayName: 'Challenge proposals',
        description:
          'What are the 🚩Challenges that you think we should be working on? Please add them below and use the template provided.',
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
    groupName: SpaceCalloutGroup.KNOWLEDGE,
    framing: {
      profile: {
        displayName: 'Relevant news, research or use cases 📰',
        description:
          'Please share any relevant insights to help us better understand the context. You can describe why it is relevant and add a link or upload a document with the article. You can also comment on the insights already submitted by other community members!',
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
    groupName: SpaceCalloutGroup.KNOWLEDGE,
    framing: {
      profile: {
        displayName: 'Reference / important documents',
        description: 'Please add links to documents with reference material.💥',
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
    groupName: SpaceCalloutGroup.KNOWLEDGE,
    framing: {
      profile: {
        displayName: '❓ FAQ',
        description:
          'Below you will find various questions and answers on this topic. Please feel invited to join in and share your answers as well!',
      },
    },
    contributionDefaults: {
      postDescription: 'Please share your question!',
    },
  },
];
