import { CalloutGroupName } from '@common/enums/callout.group.name';
import { CalloutState } from '@common/enums/callout.state';
import { CalloutType } from '@common/enums/callout.type';
import { CreateCalloutInput } from '@domain/collaboration/callout';
import { EMPTY_WHITEBOARD_CONTENT } from '@domain/common/whiteboard/empty.whiteboard.content';

export const subspaceDefaultCallouts: CreateCalloutInput[] = [
  {
    nameID: 'general-chat',
    type: CalloutType.POST,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 2,
    groupName: CalloutGroupName.HOME,
    framing: {
      profile: {
        displayName: 'General chat 💬',
        description: 'Things you would like to discuss with the community.',
      },
    },
  },
  {
    nameID: 'getting-started',
    type: CalloutType.LINK_COLLECTION,
    contributionPolicy: {
      state: CalloutState.CLOSED,
    },
    sortOrder: 1,
    groupName: CalloutGroupName.HOME,
    framing: {
      profile: {
        displayName: 'Getting Started',
        description: '⬇️ Here are some quick links to help you get started',
      },
    },
  },
  {
    nameID: 'contributor-profiles',
    type: CalloutType.POST_COLLECTION,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 2,
    groupName: CalloutGroupName.HOME,
    framing: {
      profile: {
        displayName: '👥 This is us!',
        description:
          'Here you will find the profiles of all contributors to this Space. Are you joining us? 👋 Nice to meet you! Please also provide your details below.',
      },
    },
    contributionDefaults: {
      postDescription:
        'Hi! I am... <p> In daily life I... <p> And I also like to... <p> You can contact me for anything related to... <p> My wish for this Space is.. <p> <i>And of course feel invited to insert a nice picture!</i>',
    },
  },
  {
    nameID: 'news',
    type: CalloutType.POST_COLLECTION,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 1,
    groupName: CalloutGroupName.CONTRIBUTE,
    framing: {
      profile: {
        displayName: 'Relevant news, research or use cases 📰',
        description:
          'Please share any relevant insights to help us better understand the Space. You can describe why it is relevant and add a link or upload a document with the article. You can also comment on the insights already submitted by other community members!',
      },
    },
    contributionDefaults: {
      postDescription:
        '✍️ Please share your contribution. The more details the better!',
    },
  },
  {
    nameID: 'stakeholder-map',
    type: CalloutType.WHITEBOARD,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 2,
    groupName: CalloutGroupName.CONTRIBUTE,
    framing: {
      profile: {
        displayName: 'Who are the stakeholders?',
        description:
          'Choose one of the templates from the library to map your stakeholders here!',
      },
      whiteboard: {
        content: EMPTY_WHITEBOARD_CONTENT,
        nameID: 'stakeholders',
        profileData: {
          displayName: 'stakeholder map',
        },
      },
    },
  },
  {
    nameID: 'documents',
    type: CalloutType.LINK_COLLECTION,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 3,
    groupName: CalloutGroupName.CONTRIBUTE,
    framing: {
      profile: {
        displayName: 'Reference / important documents',
        description: 'Please add links to documents with reference material.💥',
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
    groupName: CalloutGroupName.SUBSPACES,
    framing: {
      profile: {
        displayName: 'Proposals',
        description:
          'What are the 💡 Opportunities that you think we should be working on? Please add them below and use the template provided.',
      },
    },
    contributionDefaults: {
      postDescription:
        '💡 Title <p> 💬 Description <p> 🗣️ Who to involve <p> 🌟 Why this has great potential',
    },
  },
];
