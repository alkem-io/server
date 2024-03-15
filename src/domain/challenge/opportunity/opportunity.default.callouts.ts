import { CalloutGroupName } from '@common/enums/callout.group.name';
import { CalloutState } from '@common/enums/callout.state';
import { CalloutType } from '@common/enums/callout.type';
import { CreateCalloutInput } from '@domain/collaboration/callout';
import { EMPTY_WHITEBOARD_CONTENT } from '@domain/common/whiteboard/empty.whiteboard.content';

export const opportunityDefaultCallouts: CreateCalloutInput[] = [
  {
    nameID: 'getting-started',
    type: CalloutType.LINK_COLLECTION,
    contributionPolicy: {
      state: CalloutState.CLOSED,
    },
    sortOrder: 1,
    groupName: CalloutGroupName.HOME_2,
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
    groupName: CalloutGroupName.HOME_1,
    framing: {
      profile: {
        displayName: 'General chat 💬',
        description: 'Things you would like to discuss with the community.',
      },
    },
  },
  {
    nameID: 'tasks',
    type: CalloutType.POST_COLLECTION,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 2,
    groupName: CalloutGroupName.HOME_2,
    framing: {
      profile: {
        displayName: '💪 Jobs to be done...',
        description: '',
      },
    },
    contributionDefaults: {
      postDescription:
        'Task: <p>  Related to: <p> People involved: <p> Deadline:',
    },
  },
  {
    nameID: 'roles',
    type: CalloutType.POST,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 3,
    groupName: CalloutGroupName.HOME_2,
    framing: {
      profile: {
        displayName: '👋 Hi, this is us!',
        description:
          'Please introduce yourself to each other, sharing a bit about your background, goal, and (envisioned) role in this project',
      },
    },
  },
  {
    nameID: 'news',
    type: CalloutType.POST_COLLECTION,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 1,
    groupName: CalloutGroupName.CONTRIBUTE_2,
    framing: {
      profile: {
        displayName: 'Relevant news, research or use cases 📰',
        description:
          'Please share any relevant insights to help us better understand the context. You can describe why it is relevant and add a link or upload a document with the article. You can also comment on the insights already submitted by other community members!',
      },
    },
    contributionDefaults: {
      postDescription:
        'Please share your contribution. The more details the better!',
    },
  },
  {
    nameID: 'documents',
    type: CalloutType.LINK_COLLECTION,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 3,
    groupName: CalloutGroupName.CONTRIBUTE_1,
    framing: {
      profile: {
        displayName: 'Reference / important documents',
        description: 'Please add links to documents with reference material.💥',
      },
    },
  },
  {
    nameID: 'needs',
    type: CalloutType.WHITEBOARD,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 2,
    groupName: CalloutGroupName.CONTRIBUTE_2,
    framing: {
      profile: {
        displayName: 'What do we need?',
        description:
          'We can use this whiteboard to further define what is needed to realize this Opportunity! Think about research, insights, stakeholders or other resources.',
      },
      whiteboard: {
        content: EMPTY_WHITEBOARD_CONTENT,
        nameID: 'needs',
        profileData: {
          displayName: 'Identify needs',
        },
      },
    },
  },
];
