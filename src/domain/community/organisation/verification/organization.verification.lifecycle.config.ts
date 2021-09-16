export const organizationVerificationLifecycleConfig = {
  id: 'organization-verification',
  context: {
    parentID: '',
  },
  initial: 'notVerified',
  states: {
    notVerified: {
      on: {
        VERIFICATION_REQUESTED: {
          target: 'verificationPending',
        },
      },
    },
    verificationPending: {
      on: {
        MANUALLY_VERIFIED: {
          target: 'manuallyVerified',
          cond: 'organisationVerificationAuthorized',
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
