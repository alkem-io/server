import { ILifecycle } from '@domain/common/lifecycle';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { ILifecycleDefinition } from '@interfaces/lifecycle.definition.interface';
import { Injectable } from '@nestjs/common';
import { AnyStateMachine, createMachine } from 'xstate';

@Injectable()
export class InvitationLifecycleService {
  private invitationMachineStatesOnly: AnyStateMachine;

  constructor(private lifecycleService: LifecycleService) {
    this.invitationMachineStatesOnly =
      this.getInvitationLifecycleMachineWithOnlyStates();
  }

  public getState(lifecycle: ILifecycle): string {
    return this.lifecycleService.getState(
      lifecycle,
      this.invitationMachineStatesOnly
    );
  }

  public getNextEvents(lifecycle: ILifecycle): string[] {
    return this.lifecycleService.getNextEvents(
      lifecycle,
      this.invitationMachineStatesOnly
    );
  }

  public isFinalState(lifecycle: ILifecycle): boolean {
    return this.lifecycleService.isFinalState(
      lifecycle,
      this.invitationMachineStatesOnly
    );
  }

  // Need to have a local states only machine to support queries for just nextEvents, final state etc.
  // This needs to be kept in sync with the primary machine that is used for event handling on Invitations.
  private getInvitationLifecycleMachineWithOnlyStates(): AnyStateMachine {
    const config: ILifecycleDefinition = {
      id: 'user-invitation',
      context: {
        parentID: '',
      },
      initial: 'invited',
      states: {
        invited: {
          on: {
            ACCEPT: {
              target: 'accepted',
              guard: 'communityInvitationAcceptAuthorized',
            },
            REJECT: {
              target: 'rejected',
              guard: 'communityUpdateAuthorized',
            },
          },
        },
        accepted: {
          type: 'final',
          entry: ['communityAddMember'],
        },
        rejected: {
          on: {
            REINVITE: {
              target: 'invited',
              guard: 'communityUpdateAuthorized',
            },
            ARCHIVE: {
              target: 'archived',
              guard: 'communityUpdateAuthorized',
            },
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
