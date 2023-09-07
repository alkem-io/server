import { CalloutState } from '@common/enums/callout.state';
import { CalloutType } from '@common/enums/callout.type';
import { CommonDisplayLocation } from '@common/enums/common.display.location';
import { OpportunityDisplayLocation } from '@common/enums/opportunity.display.location';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { TagsetType } from '@common/enums/tagset.type';
import { CreateCalloutInput } from '@domain/collaboration/callout';
import { EMPTY_WHITEBOARD_CONTENT } from '@domain/common/whiteboard/whiteboard.entity';

export const opportunityDefaultCallouts: CreateCalloutInput[] = [
  {
    nameID: 'getting-started',
    type: CalloutType.LINK_COLLECTION,
    state: CalloutState.CLOSED,
    sortOrder: 3,
    profile: {
      displayName: 'Getting Started',
      description: '⬇️ Here are some quick links to help you get started',
      tagsets: [
        {
          name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
          type: TagsetType.SELECT_ONE,
          tags: [CommonDisplayLocation.HOME_TOP],
        },
      ],
    },
  },
  {
    nameID: 'general-chat',
    type: CalloutType.POST,
    state: CalloutState.OPEN,
    sortOrder: 1,
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
  {
    nameID: 'tasks',
    type: CalloutType.POST_COLLECTION,
    state: CalloutState.OPEN,
    sortOrder: 1,
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
    postTemplate: {
      type: 'Task',
      defaultDescription:
        'Task: <p>  Related to: <p> People involved: <p> Deadline:',
      profile: {
        displayName: 'task',
        description: 'To share tasks with the community that can be picked up.',
      },
    },
  },
  {
    nameID: 'roles',
    type: CalloutType.POST,
    state: CalloutState.OPEN,
    sortOrder: 2,
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
  {
    nameID: 'news',
    type: CalloutType.POST_COLLECTION,
    state: CalloutState.OPEN,
    sortOrder: 1,
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
    nameID: 'documents',
    type: CalloutType.LINK_COLLECTION,
    state: CalloutState.OPEN,
    sortOrder: 3,
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
  {
    nameID: 'needs',
    type: CalloutType.WHITEBOARD,
    state: CalloutState.OPEN,
    sortOrder: 2,
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
];
