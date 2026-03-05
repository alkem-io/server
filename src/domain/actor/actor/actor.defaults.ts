export const actorDefaults: any = {
  references: [
    {
      name: 'linkedin',
      description: 'User profile on LinkedIn',
      uri: '',
    },
    {
      name: 'github',
      description: 'User profile on GitSpace',
      uri: '',
    },
    {
      name: 'bsky',
      description: 'User profile on BlueSky',
      uri: '',
    },
  ],
};

/** @deprecated Use actorDefaults instead */
export const contributorDefaults = actorDefaults;
