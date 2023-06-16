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
          cond: 'communityInvitationAcceptAuthorized',
        },
        REJECT: {
          target: 'rejected',
          cond: 'communityUpdateAuthorized',
        },
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
        REINVITE: {
          target: 'invited',
          cond: 'communityUpdateAuthorized',
        },
        ARCHIVE: {
          target: 'archived',
          cond: 'communityUpdateAuthorized',
        },
      },
    },
    archived: {
      type: 'final',
    },
  },
};
