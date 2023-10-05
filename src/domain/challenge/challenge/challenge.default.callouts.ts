import { CalloutState } from '@common/enums/callout.state';
import { CalloutType } from '@common/enums/callout.type';
import { ChallengeDisplayLocation } from '@common/enums/challenge.display.location';
import { CommonDisplayLocation } from '@common/enums/common.display.location';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { TagsetType } from '@common/enums/tagset.type';
import { CreateCalloutInput } from '@domain/collaboration/callout';
import { EMPTY_WHITEBOARD_CONTENT } from '@domain/common/whiteboard/whiteboard.entity';

export const challengeDefaultCallouts: CreateCalloutInput[] = [
  {
    nameID: 'getting-started',
    type: CalloutType.LINK_COLLECTION,
    state: CalloutState.CLOSED,
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
    state: CalloutState.OPEN,
    sortOrder: 2,
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
    nameID: 'contributor-profiles',
    type: CalloutType.POST_COLLECTION,
    state: CalloutState.OPEN,
    sortOrder: 2,
    framing: {
      profile: {
        displayName: '👥 This is us!',
        description:
          'Here you will find the profiles of all contributors to this Challenge. Are you joining us? 👋 Nice to meet you! Please also provide your details below.',
        tagsets: [
          {
            name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
            type: TagsetType.SELECT_ONE,
            tags: [CommonDisplayLocation.HOME_RIGHT],
          },
        ],
      },
    },
    postTemplate: {
      type: 'Profile',
      defaultDescription:
        'Hi! I am... <p> In daily life I... <p> And I also like to... <p> You can contact me for anything related to... <p> My wish for this Challenge is.. <p> <i>And of course feel invited to insert a nice picture!</i>',
      profile: {
        displayName: 'Profile',
        description:
          'To stimulate contributors to share more details about their profile.',
      },
    },
  },
  {
    nameID: 'news',
    type: CalloutType.POST_COLLECTION,
    state: CalloutState.OPEN,
    sortOrder: 1,
    framing: {
      profile: {
        displayName: 'Relevant news, research or use cases 📰',
        description:
          'Please share any relevant insights to help us better understand the Challenge. You can describe why it is relevant and add a link or upload a document with the article. You can also comment on the insights already submitted by other community members!',
        tagsets: [
          {
            name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
            type: TagsetType.SELECT_ONE,
            tags: [ChallengeDisplayLocation.CONTRIBUTE_RIGHT],
          },
        ],
      },
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
    framing: {
      profile: {
        displayName: 'Who are the stakeholders?',
        description:
          'Choose one of the templates from the library to map your stakeholders here!',
        tagsets: [
          {
            name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
            type: TagsetType.SELECT_ONE,
            tags: [ChallengeDisplayLocation.CONTRIBUTE_RIGHT],
          },
        ],
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
    state: CalloutState.OPEN,
    sortOrder: 3,
    framing: {
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
  },
  {
    nameID: 'opportunity-ideas',
    type: CalloutType.POST,
    state: CalloutState.OPEN,
    sortOrder: 1,
    framing: {
      profile: {
        displayName: '💡 What Opportunities do you see?',
        description:
          'Please share any relevant direction for a solution that you can think of or have seen.',
        tagsets: [
          {
            name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
            type: TagsetType.SELECT_ONE,
            tags: [ChallengeDisplayLocation.OPPORTUNITIES_LEFT],
          },
        ],
      },
    },
  },
  {
    nameID: 'proposals',
    type: CalloutType.POST_COLLECTION,
    state: CalloutState.OPEN,
    sortOrder: 1,
    framing: {
      profile: {
        displayName: 'Opportunity proposals',
        description:
          'What are the 💡 Opportunities that you think we should be working on? Please add them below and use the template provided.',
        tagsets: [
          {
            name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
            type: TagsetType.SELECT_ONE,
            tags: [ChallengeDisplayLocation.OPPORTUNITIES_RIGHT],
          },
        ],
      },
    },
    postTemplate: {
      type: 'opportunity',
      defaultDescription:
        '💡 Title <p> 💬 Description <p> 🗣️ Who to involve <p> 🌟 Why this has great potential',
      profile: {
        displayName: 'opportunity',
        description: 'To share proposals for Opportunities to be worked on.',
      },
    },
  },
];
