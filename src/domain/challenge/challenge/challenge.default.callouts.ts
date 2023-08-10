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
    nameID: 'welcome',
    type: CalloutType.POST,
    state: CalloutState.OPEN,
    sortOrder: 1,
    profile: {
      displayName: 'Why do you care about this Challenge?',
      description:
        '👋 Please share a few words about yourself to help the community get to know each other. For example, why is this Challenge important to you, or relevant thoughts, experience or expertise.',
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
    nameID: 'recommendations',
    type: CalloutType.LINK_COLLECTION,
    state: CalloutState.CLOSED,
    sortOrder: 3,
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
  },
  {
    nameID: 'general-chat',
    type: CalloutType.POST,
    state: CalloutState.OPEN,
    sortOrder: 2,
    profile: {
      displayName: 'General chat',
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
  {
    nameID: 'news',
    type: CalloutType.POST_COLLECTION,
    state: CalloutState.OPEN,
    sortOrder: 1,
    profile: {
      displayName: 'Relevant news, research or use cases 📰',
      description:
        'Please share any relevant insights to help us better understand the Challenge. You can describe why it is relevant and add a link or upload a document with the article. You can also comment on the insights already submitted by other community members!',
      tagsets: [
        {
          name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
          type: TagsetType.SELECT_ONE,
          tags: [ChallengeDisplayLocation.CONTRIBUTE],
        },
      ],
    },
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
    nameID: 'stakeholder-map',
    type: CalloutType.WHITEBOARD,
    state: CalloutState.OPEN,
    sortOrder: 2,
    profile: {
      displayName: 'Who are the stakeholders?',
      description:
        'Choose one of the templates from the library to map your stakeholders here!',
      tagsets: [
        {
          name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
          type: TagsetType.SELECT_ONE,
          tags: [ChallengeDisplayLocation.CONTRIBUTE],
        },
      ],
    },
    whiteboard: {
      value: EMPTY_WHITEBOARD_VALUE,
      nameID: 'stakeholders',
      profileData: {
        displayName: 'stakeholder map',
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
          tags: [ChallengeDisplayLocation.CONTRIBUTE],
        },
      ],
    },
  },
  {
    nameID: 'opportunity-ideas',
    type: CalloutType.POST,
    state: CalloutState.OPEN,
    sortOrder: 1,
    profile: {
      displayName: 'What Opportunities do you see?',
      description:
        '👋 Please share any relevant direction for a solution that you can think of or have seen?',
      tagsets: [
        {
          name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
          type: TagsetType.SELECT_ONE,
          tags: [ChallengeDisplayLocation.OPPORTUNITIES_LEFT],
        },
      ],
    },
  },
  {
    nameID: 'proposals',
    type: CalloutType.POST_COLLECTION,
    state: CalloutState.OPEN,
    sortOrder: 1,
    profile: {
      displayName: 'Opportunity proposals 🎯',
      description:
        'Do you have a specific Opportunity you would like to pick up with other community members? Please share your proposal here! You can also comment on proposals by others if you want to work on that Opportunity as well!',
      tagsets: [
        {
          name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
          type: TagsetType.SELECT_ONE,
          tags: [ChallengeDisplayLocation.OPPORTUNITIES_RIGHT],
        },
      ],
    },
    postTemplate: {
      type: 'opportunity',
      defaultDescription:
        '✍️ Describe your Opportunity, what the impact is, and who you would like to involve.',
      profile: {
        displayName: 'opportunity',
        description: 'To share proposals for Opportunities to be worked on.',
      },
    },
  },
];
