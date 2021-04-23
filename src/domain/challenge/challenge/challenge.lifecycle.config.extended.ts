export const challengeLifecycleConfigExtended = {
  id: 'challenge-lifecycle-extended',
  context: {
    parentID: '-1',
  },
  initial: 'new',
  states: {
    new: {
      on: {
        REFINE: 'beingRefined',
        ABANDONED: 'abandoned',
      },
    },
    beingRefined: {
      on: {
        REVIEW: 'awaitingApproval',
        ABANDONED: 'abandoned',
      },
    },
    awaitingApproval: {
      on: {
        APPROVED: 'inProgress',
        ABANDONED: 'abandoned',
      },
    },
    inProgress: {
      entry: ['sampleEvent'],
      on: {
        COMPLETED: 'complete',
        ABAONDONED: 'abandoned',
      },
    },
    complete: {
      on: {
        ARCHIVE: 'archived',
        ABAONDONED: 'archived',
      },
    },
    abandoned: {
      on: {
        REOPEN: 'inProgress',
        ARCHIVE: 'archived',
      },
    },
    archived: {
      type: 'final',
    },
  },
};
