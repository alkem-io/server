import { CalloutState } from '@common/enums/callout.state';
import { CalloutType } from '@common/enums/callout.type';
import { CalloutVisibility } from '@common/enums/callout.visibility';

export const collaborationDefaults: any = {
  callouts: [
    {
      type: CalloutType.CANVAS,
      displayName: 'Collaborate visually',
      nameID: `${CalloutType.CANVAS}-default`,
      description:
        'Collaborate visually using Canvases. Create a new Canvas from a template, or explore Canvases already created.',
      visibility: CalloutVisibility.PUBLISHED,
      state: CalloutState.OPEN,
    },
    {
      type: CalloutType.CARD,
      displayName: 'Contribute',
      nameID: `${CalloutType.CARD}-default`,
      description:
        'Contribute your insights to understanding the context. It is about surfacing up the wisdom of the community. Add your own card, or comment on aspects added by others.',
      visibility: CalloutVisibility.PUBLISHED,
      state: CalloutState.OPEN,
    },
  ],
};
