export const CanvasCheckoutLifecycleConfig = {
  id: 'canvas-checkout',
  context: {
    parentID: '',
  },
  initial: 'available',
  states: {
    available: {
      entry: ['availableEntry'],
      on: {
        CHECKOUT: {
          cond: 'CanvasCheckoutAuthorized',
          target: 'checkedOut',
          actions: ['lockedTransition', 'checkout'],
        },
      },
      exit: ['availableExit'],
    },
    checkedOut: {
      entry: ['lockedEntry'],
      on: {
        CHECKIN: {
          cond: 'CanvasCheckinAuthorized',
          target: 'available',
          actions: ['availableTransition', 'checkin'],
        },
      },
      exit: ['lockedExit'],
    },
  },
};
