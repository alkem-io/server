export const templatesSetDefaults: any = {
  aspects: [
    {
      templateInfo: {
        title: 'knowledge',
        description: 'To share relevant knowledge, building blocks etc.',
        tags: [],
      },
      type: 'knowledge',
      defaultDescription: 'Please describe the knowledge that is relevant.',
    },
    {
      templateInfo: {
        title: 'stakeholder persona',
        description:
          'To share a relevant persona, who would be either actively engaged, impacted by results, needs to informed, supportive etc',
        tags: [],
      },
      type: 'stakeholder persona',
      defaultDescription:
        'Please describe the stakeholder persona that is relevant.',
    },
    {
      templateInfo: {
        title: 'related initiative',
        description:
          'Other initiatives that are relevant, be they similar in nature, supporting or just to be aware of.',
        tags: [],
      },
      type: 'related initiative',
      defaultDescription:
        'Please describe the related initiative that is relevant.',
    },
    {
      templateInfo: {
        title: 'idea',
        description:
          'Ideas that are later elicited and can be used to make progress.',
        tags: [],
      },
      type: 'idea',
      defaultDescription: 'Please describe the idea that is relevant.',
    },
    {
      templateInfo: {
        title: 'other',
        description:
          'Any other relevant information that can contribute to make progress.',
        tags: [],
      },
      type: 'other',
      defaultDescription: 'Please describe the aspect that you wish to share.',
    },
  ],
};
