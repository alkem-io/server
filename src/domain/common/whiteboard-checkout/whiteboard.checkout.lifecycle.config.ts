import { ILifecycleDefinition } from '@interfaces/lifecycle.definition.interface';

export const WhiteboardCheckoutLifecycleConfig: ILifecycleDefinition = {
  id: 'whiteboard-checkout',
  context: {
    parentID: '',
  },
  initial: 'available',
  states: {
    available: {
      entry: ['availableEntry'],
      on: {
        CHECKOUT: {
          cond: 'WhiteboardCheckoutAuthorized',
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
          cond: 'WhiteboardCheckinAuthorized',
          target: 'available',
          actions: ['availableTransition', 'checkin'],
        },
      },
      exit: ['lockedExit'],
    },
  },
};
