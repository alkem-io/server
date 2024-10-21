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
          guard: 'organizationVerificationUpdateAuthorized',
        },
      },
    },
    verificationPending: {
      on: {
        MANUALLY_VERIFY: {
          target: 'manuallyVerified',
          guard: 'organizationVerificationGrantAuthorized',
        },
        REJECT: 'rejected',
      },
    },
    manuallyVerified: {
      entry: ['organizationManuallyVerified'],
      on: {
        RESET: {
          target: 'notVerified',
          guard: 'organizationVerificationGrantAuthorized',
        },
      },
    },
    rejected: {
      on: {
        REOPEN: {
          target: 'notVerified',
          guard: 'organizationVerificationGrantAuthorized',
        },
        ARCHIVE: {
          target: 'archived',
          guard: 'organizationVerificationGrantAuthorized',
        },
      },
    },
    archived: {
      type: 'final',
    },
  },
};
