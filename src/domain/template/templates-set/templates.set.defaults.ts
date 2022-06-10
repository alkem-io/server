export const templatesSetDefaults: any = {
  aspects: [
    {
      info: {
        title: 'knowledge',
        description: 'To share relevant knowledge, building blocks etc.',
        tags: [],
      },
      type: 'knowledge',
      defaultDescription: 'Please describe the knowledge that is relevant.',
    },
    {
      info: {
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
      info: {
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
      info: {
        title: 'idea',
        description:
          'Ideas that are later elicited and can be used to make progress.',
        tags: [],
      },
      type: 'idea',
      defaultDescription: 'Please describe the idea that is relevant.',
    },
    {
      info: {
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
