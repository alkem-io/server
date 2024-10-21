import { ILifecycleDefinition } from '@interfaces/lifecycle.definition.interface';

export const applicationLifecycleConfig: ILifecycleDefinition = {
  id: 'user-application',
  context: {
    parentID: '',
  },
  initial: 'new',
  states: {
    new: {
      on: {
        APPROVE: {
          target: 'approved',
          guard: 'communityUpdateAuthorized',
        },
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
