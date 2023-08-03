import { CalloutState } from '@common/enums/callout.state';
import { CalloutType } from '@common/enums/callout.type';
import { CommonDisplayLocation } from '@common/enums/common.display.location';
import { OpportunityDisplayLocation } from '@common/enums/opportunity.display.location';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { TagsetType } from '@common/enums/tagset.type';
import { CreateCalloutInput } from '@domain/collaboration/callout';
import { EMPTY_WHITEBOARD_VALUE } from '@domain/common/whiteboard/whiteboard.entity';

export const opportunityDefaultCallouts: CreateCalloutInput[] = [
  {
    type: CalloutType.LINK_COLLECTION,
    profile: {
      displayName: 'Recommended by the Host',
      description: 'Please find below quick start links.',
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
      displayName: 'Task list 🎯',
      description:
        'Time to get to action! Add a task to this list or find one to pick up!',
      tagsets: [
        {
          name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
          type: TagsetType.SELECT_ONE,
          tags: [CommonDisplayLocation.HOME_RIGHT],
        },
      ],
    },
    nameID: `${CalloutType.POST_COLLECTION}-default`,
    state: CalloutState.OPEN,
    sortOrder: 1,
    postTemplate: {
      type: 'Task',
      defaultDescription:
        '✍️ Please describe what has to be done and potentially by whom. The more details the better!',
      profile: {
        displayName: 'task',
        description:
          'To share tasks with the community that can be picked up.',
      },
    },
    displayLocation: CalloutDisplayLocation.HOME_RIGHT,
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
          tags: [OpportunityDisplayLocation.CONTRIBUTE_RIGHT],
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
    type: CalloutType.LINK_COLLECTION,
    profile: {
      displayName: 'Reference / relevant documents',
      description: 'Please add links to documents with reference material.💥',
      tagsets: [
        {
          name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
          type: TagsetType.SELECT_ONE,
          tags: [CommonDisplayLocation.CONTRIBUTE],
        },
      ],
    },
    nameID: 'documents',
    state: CalloutState.OPEN,
    sortOrder: 2,
  },  
  {
    type: CalloutType.WHITEBOARD_COLLECTION,
    profile: {
      displayName: 'Collaborate visually',
      description:
        'Collaborate visually using Whiteboards. Create a new Whiteboard from a template, or explore Whiteboards already created.',
      tagsets: [
        {
          name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
          type: TagsetType.SELECT_ONE,
          tags: [OpportunityDisplayLocation.CONTRIBUTE],
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

];
