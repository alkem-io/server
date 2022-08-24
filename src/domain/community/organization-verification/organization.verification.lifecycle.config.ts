import { ILifecycleDefinition } from '@interfaces/lifecycle.definition.interface';

export const organizationVerificationLifecycleConfig: ILifecycleDefinition = {
  id: 'organization-verification',
  context: {
    parentID: '',
  },
  initial: 'notVerified',
  states: {
    notVerified: {
      on: {
        VERIFICATION_REQUEST: {
          target: 'verificationPending',
          cond: 'organizationVerificationUpdateAuthorized',
        },
      },
    },
    verificationPending: {
      on: {
        MANUALLY_VERIFY: {
          target: 'manuallyVerified',
          cond: 'organizationVerificationGrantAuthorized',
        },
        REJECT: 'rejected',
      },
    },
    manuallyVerified: {
      entry: ['organizationManuallyVerified'],
      data: {
        organizationID: (context: any, _event: any) => context.parentID,
      },
      on: {
        RESET: {
          target: 'notVerified',
          cond: 'organizationVerificationGrantAuthorized',
        },
      },
    },
    rejected: {
      on: {
        REOPEN: 'notVerified',
        ARCHIVE: 'archived',
      },
    },
    archived: {
      type: 'final',
    },
  },
};
