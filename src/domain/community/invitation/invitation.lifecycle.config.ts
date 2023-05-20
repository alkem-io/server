import { ILifecycleDefinition } from '@interfaces/lifecycle.definition.interface';

export const invitationLifecycleConfig: ILifecycleDefinition = {
  id: 'user-invitation',
  context: {
    parentID: '',
  },
  initial: 'invited',
  states: {
    invited: {
      on: {
        ACCEPT: {
          target: 'accepted',
          cond: 'communityUpdateAuthorized',
        },
        REJECT: 'rejected',
      },
    },
    accepted: {
      type: 'final',
      entry: ['communityAddMember'],
      data: {
        invitationID: (context: any, _event: any) => context.parentID,
      },
    },
    rejected: {
      on: {
        REINVITE: 'invited',
        ARCHIVE: 'archived',
      },
    },
    archived: {
      type: 'final',
    },
  },
};
