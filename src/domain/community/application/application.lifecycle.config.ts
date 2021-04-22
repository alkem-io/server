export const applicationLifecycleConfig = {
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
      data: {
        applicationID: (context: any, _event: any) => context.parentID,
      },
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
