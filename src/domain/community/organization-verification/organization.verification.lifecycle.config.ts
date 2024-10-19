import { ILifecycleDefinition } from '@interfaces/lifecycle.definition.interface';

export const organizationVerificationLifecycleConfig: ILifecycleDefinition = {
  id: 'organization-verification',
  context: {},
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

      on: {
        RESET: {
          target: 'notVerified',
          cond: 'organizationVerificationGrantAuthorized',
        },
      },
    },
    rejected: {
      on: {
        REOPEN: {
          target: 'notVerified',
          cond: 'organizationVerificationGrantAuthorized',
        },
        ARCHIVE: {
          target: 'archived',
          cond: 'organizationVerificationGrantAuthorized',
        },
      },
    },
    archived: {
      type: 'final',
    },
  },
};
