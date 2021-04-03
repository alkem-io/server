export const applicationLifecycle = {
  id: 'user-application',
  initial: 'new',
  states: {
    new: { on: { APPROVE: 'approved', REJECT: 'rejected' } },
    approved: { type: 'final' },
    rejected: { on: { REOPEN: 'new' } },
  },
};
