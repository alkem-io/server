export const organizationVerificationLifecycleConfig = {
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
      type: 'final',
      entry: ['organizationManuallyVerified'],
      data: {
        organizationID: (context: any, _event: any) => context.parentID,
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
