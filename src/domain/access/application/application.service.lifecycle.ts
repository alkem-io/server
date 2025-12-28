import { ILifecycle } from '@domain/common/lifecycle';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { ILifecycleDefinition } from '@interfaces/lifecycle.definition.interface';
import { Injectable } from '@nestjs/common';
import { AnyStateMachine, createMachine } from 'xstate';

@Injectable()
export class ApplicationLifecycleService {
  private readonly applicationMachineStatesOnly: AnyStateMachine;

  constructor(private lifecycleService: LifecycleService) {
    this.applicationMachineStatesOnly =
      this.getApplicationLifecycleMachineWithOnlyStates();
  }

  public getState(lifecycle: ILifecycle): string {
    return this.lifecycleService.getState(
      lifecycle,
      this.applicationMachineStatesOnly
    );
  }

  public getNextEvents(lifecycle: ILifecycle): string[] {
    return this.lifecycleService.getNextEvents(
      lifecycle,
      this.applicationMachineStatesOnly
    );
  }

  public isFinalState(lifecycle: ILifecycle): boolean {
    return this.lifecycleService.isFinalState(
      lifecycle,
      this.applicationMachineStatesOnly
    );
  }

  // Need to have a local states only machine to support queries for just nextEvents, final state etc.
  // This needs to be kept in sync with the primary machine that is used for event handling on Applications.
  private getApplicationLifecycleMachineWithOnlyStates(): AnyStateMachine {
    return createMachine(applicationLifecycleMachine);
  }
}
export enum ApplicationLifecycleState {
  NEW = 'new',
  APPROVING = 'approving',
  APPROVED = 'approved',
  ARCHIVED = 'archived',
  REJECTED = 'rejected',
}

export enum ApplicationLifecycleEvent {
  APPROVED = 'APPROVED',
}

export const applicationLifecycleMachine: ILifecycleDefinition = {
  id: 'contributor-application',
  context: {},
  initial: ApplicationLifecycleState.NEW,
  states: {
    new: {
      on: {
        APPROVE: {
          guard: 'hasGrantPrivilege',
          target: ApplicationLifecycleState.APPROVING,
        },
        REJECT: {
          guard: 'hasUpdatePrivilege',
          target: ApplicationLifecycleState.REJECTED,
        },
      },
    },
    approving: {
      on: {
        APPROVED: {
          guard: 'hasGrantPrivilege',
          target: ApplicationLifecycleState.APPROVED,
        },
      },
    },
    approved: {
      type: 'final',
    },
    rejected: {
      on: {
        REOPEN: {
          guard: 'hasUpdatePrivilege',
          target: ApplicationLifecycleState.NEW,
        },
        ARCHIVE: {
          guard: 'hasUpdatePrivilege',
          target: ApplicationLifecycleState.ARCHIVED,
        },
      },
    },
    archived: {
      type: 'final',
    },
  },
};
