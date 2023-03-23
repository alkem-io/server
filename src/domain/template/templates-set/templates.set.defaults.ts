import { LifecycleType } from '@common/enums/lifecycle.type';
import { challengeLifecycleConfigDefault } from './templates.set.default.lifecycle.challenge';
import { opportunityLifecycleConfigDefault } from './templates.set.default.lifecycle.opportunity';

export const templatesSetDefaults: any = {
  aspects: [
    {
      profile: {
        displayName: 'knowledge',
        description: 'To share relevant knowledge, building blocks etc.',
        tags: [],
      },
      type: 'knowledge',
      defaultDescription: 'Please describe the knowledge that is relevant.',
    },
    {
      profile: {
        displayName: 'stakeholder persona',
        description:
          'To share a relevant persona, who would be either actively engaged, impacted by results, needs to profilermed, supportive etc',
        tags: [],
      },
      type: 'stakeholder persona',
      defaultDescription:
        'Please describe the stakeholder persona that is relevant.',
    },
    {
      profile: {
        displayName: 'related initiative',
        description:
          'Other initiatives that are relevant, be they similar in nature, supporting or just to be aware of.',
        tags: [],
      },
      type: 'related initiative',
      defaultDescription:
        'Please describe the related initiative that is relevant.',
    },
    {
      profile: {
        displayName: 'idea',
        description:
          'Ideas that are later elicited and can be used to make progress.',
        tags: [],
      },
      type: 'idea',
      defaultDescription: 'Please describe the idea that is relevant.',
    },
    {
      profile: {
        displayName: 'other',
        description:
          'Any other relevant information that can contribute to make progress.',
        tags: [],
      },
      type: 'other',
      defaultDescription: 'Please describe the aspect that you wish to share.',
    },
  ],
  lifecycles: [
    {
      profile: {
        displayName: 'Default Challenge lifecycle',
        description: 'Default Challenge lifecycle',
        tags: [],
      },
      type: LifecycleType.CHALLENGE,
      definition: JSON.stringify(challengeLifecycleConfigDefault),
    },
    {
      profile: {
        displayName: 'Default Opportunity lifecycle',
        description: 'Default Opportunity lifecycle',
        tags: [],
      },
      type: LifecycleType.OPPORTUNITY,
      definition: JSON.stringify(opportunityLifecycleConfigDefault),
    },
  ],
};
