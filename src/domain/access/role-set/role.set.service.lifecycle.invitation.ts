import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AuthorizationPrivilege } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ActorContext } from '@core/actor-context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AnyStateMachine, setup } from 'xstate';
import { invitationLifecycleMachine } from '../invitation/invitation.service.lifecycle';

@Injectable()
export class RoleSetServiceLifecycleInvitation {
  private readonly invitationMachine: AnyStateMachine;
  constructor(
    private authorizationService: AuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    this.invitationMachine = this.getMachine();
  }

  public getInvitationMachine(): AnyStateMachine {
    return this.invitationMachine;
  }

  private getMachine(): AnyStateMachine {
    const machine = setup({
      guards: {
        hasUpdatePrivilege: ({ event }) => {
          const actorContext: ActorContext = event.actorContext;
          const authorizationPolicy: AuthorizationPolicy = event.authorization;
          return this.authorizationService.isAccessGranted(
            actorContext,
            authorizationPolicy,
            AuthorizationPrivilege.UPDATE
          );
        },
        hasInvitationAcceptPrivilege: ({ event }) => {
          const actorContext: ActorContext = event.actorContext;
          const authorizationPolicy: AuthorizationPolicy = event.authorization;
          return this.authorizationService.isAccessGranted(
            actorContext,
            authorizationPolicy,
            AuthorizationPrivilege.ROLESET_ENTRY_ROLE_INVITE_ACCEPT
          );
        },
      },
    });
    return machine.createMachine(invitationLifecycleMachine);
  }
}
