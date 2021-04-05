export const applicationLifecycle = {
  id: 'user-application',
  context: {
    parentID: '-1',
  },
  initial: 'new',
  states: {
    new: {
      on: {
        APPROVE: 'approved',
        REJECT: 'rejected',
      },
    },
    approved: {
      type: 'final',
      entry: ['communityAddMember'],
    },
    rejected: {
      on: {
        REOPEN: 'new',
        ARCHIVE: 'archived',
      },
    },
    archived: {
      type: 'final',
    },
  },
};
