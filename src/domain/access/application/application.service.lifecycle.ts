import { ILifecycle } from '@domain/common/lifecycle';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { ILifecycleDefinition } from '@interfaces/lifecycle.definition.interface';
import { Injectable } from '@nestjs/common';
import { AnyStateMachine, createMachine } from 'xstate';

@Injectable()
export class ApplicationLifecycleService {
  private applicationMachineStatesOnly: AnyStateMachine;

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
    const config: ILifecycleDefinition = {
      id: 'user-application',
      context: {
        parentID: '',
      },
      initial: 'new',
      states: {
        new: {
          on: {
            APPROVE: {
              target: 'approved',
              guard: 'communityUpdateAuthorized',
            },
            REJECT: 'rejected',
          },
        },
        approved: {
          type: 'final',
          entry: ['communityAddMember'],
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
    return createMachine(config);
  }
}
