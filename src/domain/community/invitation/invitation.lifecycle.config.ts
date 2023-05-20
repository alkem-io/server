import { ILifecycleDefinition } from '@interfaces/lifecycle.definition.interface';

export const invitationLifecycleConfig: ILifecycleDefinition = {
  id: 'user-invitation',
  context: {
    parentID: '',
  },
  initial: 'new',
  states: {
    new: {
      on: {
        APPROVE: {
          target: 'approved',
          cond: 'communityUpdateAuthorized',
        },
        REJECT: 'rejected',
      },
    },
    approved: {
      type: 'final',
      entry: ['communityAddMember'],
      data: {
        invitationID: (context: any, _event: any) => context.parentID,
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
