export const applicationLifecycle = {
  id: 'toggle',
  initial: 'inactive',
  states: {
    inactive: { on: { TOGGLE: 'active' } },
    active: { on: { TOGGLE2: 'inactive' } },
  },
};
