import { CalloutState } from '@common/enums/callout.state';
import { CalloutType } from '@common/enums/callout.type';
import { CommonDisplayLocation } from '@domain/challenge/space.defaults/definitions/common.display.location';
import { OpportunityDisplayLocation } from '@domain/challenge/space.defaults/definitions/opportunity.display.location';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { TagsetType } from '@common/enums/tagset.type';
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
        description: 'Things you would like to discuss with the community.',
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
    nameID: 'tasks',
    type: CalloutType.POST_COLLECTION,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 2,
    framing: {
      profile: {
        displayName: '💪 Jobs to be done...',
        description: '',
        tagsets: [
          {
            name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
            type: TagsetType.SELECT_ONE,
            tags: [CommonDisplayLocation.HOME_RIGHT],
          },
        ],
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
    framing: {
      profile: {
        displayName: '👋 Hi, this is us!',
        description:
          'Please introduce yourself to each other, sharing a bit about your background, goal, and (envisioned) role in this project',
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
            tags: [OpportunityDisplayLocation.CONTRIBUTE_RIGHT],
          },
        ],
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
    framing: {
      profile: {
        displayName: 'Reference / important documents',
        description: 'Please add links to documents with reference material.💥',
        tagsets: [
          {
            name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
            type: TagsetType.SELECT_ONE,
            tags: [OpportunityDisplayLocation.CONTRIBUTE],
          },
        ],
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
    framing: {
      profile: {
        displayName: 'What do we need?',
        description:
          'We can use this whiteboard to further define what is needed to realize this Opportunity! Think about research, insights, stakeholders or other resources.',
        tagsets: [
          {
            name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
            type: TagsetType.SELECT_ONE,
            tags: [OpportunityDisplayLocation.CONTRIBUTE_RIGHT],
          },
        ],
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
