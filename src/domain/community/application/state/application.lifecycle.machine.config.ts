import { MachineConfig } from 'xstate';
import { ApplicationLifecycleEvent } from './application.lifecycle.events';
import {
  ApplicationLifecycleContext,
  ApplicationLifecycleSchema,
} from './application.lifecycle.schema';

export const context: ApplicationLifecycleContext = {
  applicationID: -1,
};

export const communityLifecycleMachineConfig: MachineConfig<
  ApplicationLifecycleContext,
  ApplicationLifecycleSchema,
  ApplicationLifecycleEvent
> = {
  id: 'user-application',
  context,
  initial: 'new',
  states: {
    new: {
      on: {
        APPROVE: [
          {
            target: 'approved',
            actions: ['communityAddMember'],
          },
        ],
        REJECT: 'rejected',
      },
    },
    approved: {
      type: 'final',
      // entry: ['communityAddMember'],
      // invoke: {
      //   id: 'approve',
      //   src: 'communityAddMember',
      // },
    },
    rejected: {
      on: {
        REOPEN: 'new',
        ARCHIVE: 'archived',
      },
    },
    archived: {
      type: 'final',
    },
  },
};
