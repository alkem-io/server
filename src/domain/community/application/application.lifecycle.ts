export const applicationLifecycle = {
  id: 'user-application',
  context: {
    applicationID: '-1',
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
      entry: ['addMember'],
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
