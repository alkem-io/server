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
          guard: 'hasInvitationAcceptPrivilege',
          target: InvitationLifecycleState.ACCEPTING,
        },
        REJECT: {
          guard: 'hasUpdatePrivilege',
          target: InvitationLifecycleState.REJECTED,
        },
      },
    },
    accepting: {
      on: {
        ACCEPTED: {
          guard: 'hasInvitationAcceptPrivilege',
          target: InvitationLifecycleState.ACCEPTED,
        },
      },
    },
    accepted: {
      type: 'final',
    },
    rejected: {
      on: {
        // There is deliberately NO transition back to `invited` here.
        //
        // A REINVITE guarded on `hasUpdatePrivilege` was reachable by the
        // INVITING Space admin (they hold UPDATE through the RoleSet's
        // inherited authorization) and bypassed every check that makes an
        // invitation legitimate: `eventOnInvitation` re-runs neither
        // `guardOrganizationInvitation` — the organization's
        // `allowSpaceInvitations` opt-out (FR-004/R2) and the Lead-slot
        // limit — nor the invitation notification, so a declining
        // organization could be returned to `invited` on a loop, silently,
        // by the exact party the opt-out exists to protect against.
        //
        // Re-inviting after a decline is not lost, only routed through its
        // single guarded owner: ARCHIVE the declined invitation (the Space
        // admin's existing "remove pending" action —
        // `useCommunityTabData.pendingDelete` already sends exactly this
        // event for a non-`invited` invitation), which IS final, and then
        // invite again through `inviteForEntryRoleOnRoleSet`, where the
        // opt-out, the Lead-slot check and the org-admin notification all
        // run as they do for any other invitation.
        ARCHIVE: {
          guard: 'hasUpdatePrivilege',
          target: InvitationLifecycleState.ARCHIVED,
        },
      },
    },
    archived: {
      type: 'final',
    },
  },
};
