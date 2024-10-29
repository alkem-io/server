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
    return createMachine(invitationLifecycleMachine);
  }
}

export enum InvitationLifecycleState {
  INVITED = 'invited',
  ACCEPTING = 'accepting',
  ACCEPTED = 'accepted',
  ARCHIVED = 'archived',
  REJECTED = 'rejected',
}

export enum InvitationLifecycleEvent {
  ACCEPTED = 'ACCEPTED',
}

export const invitationLifecycleMachine: ILifecycleDefinition = {
  id: 'contributor-invitation',
  context: {},
  initial: InvitationLifecycleState.INVITED,
  states: {
    invited: {
      on: {
        ACCEPT: {
          guards: 'hasInvitationAcceptPrivilege',
          target: InvitationLifecycleState.ACCEPTING,
        },
        REJECT: {
          guards: 'hasUpdatePrivilege',
          target: InvitationLifecycleState.REJECTED,
        },
      },
    },
    accepting: {
      on: {
        ACCEPTED: {
          guards: 'hasInvitationAcceptPrivilege',
          target: InvitationLifecycleState.ACCEPTED,
        },
      },
    },
    accepted: {
      type: 'final',
    },
    rejected: {
      on: {
        REINVITE: {
          guards: 'hasUpdatePrivilege',
          target: InvitationLifecycleState.INVITED,
        },
        ARCHIVE: {
          guards: 'hasUpdatePrivilege',
          target: InvitationLifecycleState.ARCHIVED,
        },
      },
    },
    archived: {
      type: 'final',
    },
  },
};
