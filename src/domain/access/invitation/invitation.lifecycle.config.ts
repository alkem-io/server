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
          guard: 'communityInvitationAcceptAuthorized',
        },
        REJECT: {
          target: 'rejected',
          guard: 'communityUpdateAuthorized',
        },
      },
    },
    accepted: {
      type: 'final',
      entry: ['communityAddMember'],
    },
    rejected: {
      on: {
        REINVITE: {
          target: 'invited',
          guard: 'communityUpdateAuthorized',
        },
        ARCHIVE: {
          target: 'archived',
          guard: 'communityUpdateAuthorized',
        },
      },
    },
    archived: {
      type: 'final',
    },
  },
};
