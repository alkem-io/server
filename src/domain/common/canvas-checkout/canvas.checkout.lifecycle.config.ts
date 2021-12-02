export const CanvasCheckoutLifecycleConfig = {
  id: 'canvas-checkout',
  context: {
    parentID: '',
  },
  initial: 'available',
  states: {
    available: {
      on: {
        CHECKOUT: {
          cond: 'CanvasCheckoutAuthorized',
          target: 'checkedOut',
          actions: ['checkout'],
        },
      },
    },
    checkedOut: {
      on: {
        CHECKIN: {
          cond: 'CanvasCheckinAuthorized',
          target: 'available',
          actions: ['checkin'],
        },
      },
    },
  },
};
