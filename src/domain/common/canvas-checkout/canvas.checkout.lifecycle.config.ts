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
        // Todo: this is a workaround for the fact the flag on the Canvas entity gets out of sync with
        // the state of the Lifecycle. To be removed when that situation can no longer apply, or even
        // better rely on the Lifecycle entity to get the status in an efficient way.
        CHECKIN: {
          cond: 'CanvasCheckinAuthorized',
          target: 'available',
          actions: ['availableTransition', 'checkin'],
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
        // Todo: this is a workaround for the fact the flag on the Canvas entity gets out of sync with
        // the state of the Lifecycle. To be removed when that situation can no longer apply, or even
        // better rely on the Lifecycle entity to get the status in an efficient way.
        CHECKOUT: {
          cond: 'CanvasCheckoutAuthorized',
          target: 'checkedOut',
          actions: ['lockedTransition', 'checkin'],
        },
      },
      exit: ['lockedExit'],
    },
  },
};
