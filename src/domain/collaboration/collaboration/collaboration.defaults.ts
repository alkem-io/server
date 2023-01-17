import { CalloutState } from '@common/enums/callout.state';
import { CalloutType } from '@common/enums/callout.type';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { CommunityType } from '@common/enums/community.type';

export const collaborationDefaults: any = {
  callouts: [
    {
      type: CalloutType.COMMENTS,
      communityType: CommunityType.HUB,
      displayName: 'Welcome, please introduce yourself to the community!',
      nameID: 'hub-welcome',
      description:
        'Please share a few words about yourself to help the community get to know each other. What brings you to this Hub and motivates you to work on these Challenges?',
      visibility: CalloutVisibility.PUBLISHED,
      state: CalloutState.OPEN,
      sortOrder: 1,
    },
    {
      type: CalloutType.COMMENTS,
      communityType: CommunityType.CHALLENGE,
      displayName: 'Why do you care about this Challenge?',
      nameID: 'challenge-welcome',
      description:
        'Please share why this Challenge is important to you as well as any relevant thoughts, experience or expertise.',
      visibility: CalloutVisibility.PUBLISHED,
      state: CalloutState.OPEN,
      sortOrder: 1,
    },
    {
      type: CalloutType.COMMENTS,
      displayName: 'Suggestions, Questions, and Feedback',
      nameID: 'suggestions',
      description: 'Please share it here :)',
      visibility: CalloutVisibility.PUBLISHED,
      state: CalloutState.OPEN,
      sortOrder: 3,
    },
    {
      type: CalloutType.CARD,
      displayName: 'Contribute',
      nameID: `${CalloutType.CARD}-default`,
      description:
        'Contribute your insights to understanding the context. It is about surfacing up the wisdom of the community. Add your own card, or comment on aspects added by others.',
      visibility: CalloutVisibility.PUBLISHED,
      state: CalloutState.OPEN,
      sortOrder: 5,
      cardTemplate: {
        type: 'contribution',
        defaultDescription:
          'Please share your contribution. The more details the better!',
        info: {
          title: 'contribution',
          description:
            'To share contributions with detailed explanations how they help.',
        },
      },
    },
    {
      type: CalloutType.CANVAS,
      displayName: 'Collaborate visually',
      nameID: `${CalloutType.CANVAS}-default`,
      description:
        'Collaborate visually using Canvases. Create a new Canvas from a template, or explore Canvases already created.',
      visibility: CalloutVisibility.PUBLISHED,
      state: CalloutState.OPEN,
      sortOrder: 10,
      canvasTemplate: {
        value: '',
        info: {
          title: 'contribution',
          description: 'To share contributions visually.',
        },
      },
    },
  ],
};
