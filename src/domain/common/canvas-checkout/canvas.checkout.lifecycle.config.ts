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
          target: 'checkedOut',
          cond: 'CanvasCheckoutAuthorized',
        },
      },
    },
    checkedOut: {
      on: {
        CHECKIN: {
          target: 'available',
          cond: 'CanvasCheckinAuthorized',
        },
      },
    },
  },
};
