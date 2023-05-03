import { CalloutState } from '@common/enums/callout.state';
import { CalloutType } from '@common/enums/callout.type';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { CommunityType } from '@common/enums/community.type';

const emptyCanvasValue =
  '{\n  "type": "excalidraw",\n  "version": 2,\n  "source": "",\n  "elements": [],\n  "appState": {\n    "gridSize": 20,\n    "viewBackgroundColor": "#ffffff"\n  },\n  "files": {}\n}';

export const collaborationDefaults: any = {
  callouts: [
    {
      nameID: 'hub-welcome',
      type: CalloutType.COMMENTS,
      communityType: CommunityType.HUB,
      profile: {
        displayName: 'Welcome, please introduce yourself to the community!',
        description:
          'Please share a few words about yourself to help the community get to know each other. What brings you to this Hub and motivates you to work on these Challenges?',
      },
      visibility: CalloutVisibility.PUBLISHED,
      state: CalloutState.OPEN,
      sortOrder: 1,
      group: 'COMMUNITY_1',
    },
    {
      type: CalloutType.COMMENTS,
      communityType: CommunityType.CHALLENGE,
      profile: {
        displayName: 'Why do you care about this Challenge?',
        description:
          'Please share why this Challenge is important to you as well as any relevant thoughts, experience or expertise.',
      },
      nameID: 'challenge-welcome',
      visibility: CalloutVisibility.PUBLISHED,
      state: CalloutState.OPEN,
      sortOrder: 1,
      group: 'HOME_2',
    },
    {
      type: CalloutType.COMMENTS,
      profile: {
        displayName: 'Recommended by the Host',
        description: 'Please find below quick start links.',
      },
      nameID: 'recommendations',
      visibility: CalloutVisibility.PUBLISHED,
      state: CalloutState.CLOSED,
      sortOrder: 3,
      group: 'HOME_0',
    },
    {
      type: CalloutType.COMMENTS,
      profile: {
        displayName: 'Suggestions, Questions, and Feedback',
        description: 'Please share it here :)',
      },
      nameID: 'suggestions',
      visibility: CalloutVisibility.PUBLISHED,
      state: CalloutState.OPEN,
      sortOrder: 3,
      group: 'HOME_2',
    },
    {
      type: CalloutType.CARD,
      profile: {
        displayName: 'Contribute',
        description:
          'Contribute your insights to understanding the context. It is about surfacing up the wisdom of the community. Add your own card, or comment on aspects added by others.',
      },
      nameID: `${CalloutType.CARD}-default`,
      visibility: CalloutVisibility.PUBLISHED,
      state: CalloutState.OPEN,
      sortOrder: 5,
      postTemplate: {
        type: 'contribution',
        defaultDescription:
          'Please share your contribution. The more details the better!',
        info: {
          title: 'contribution',
          description:
            'To share contributions with detailed explanations how they help.',
        },
      },
      group: 'KNOWLEDGE',
    },
    {
      type: CalloutType.CANVAS,
      profile: {
        displayName: 'Collaborate visually',
        description:
          'Collaborate visually using Canvases. Create a new Canvas from a template, or explore Canvases already created.',
      },
      nameID: `${CalloutType.CANVAS}-default`,
      visibility: CalloutVisibility.PUBLISHED,
      state: CalloutState.OPEN,
      sortOrder: 10,
      whiteboardTemplate: {
        value: emptyCanvasValue,
        profile: {
          displayName: 'blank canvas',
          description: 'A blank canvas to be worked further.',
        },
      },
      group: 'KNOWLEDGE',
    },
  ],
};
