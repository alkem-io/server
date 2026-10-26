import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AnyStateMachine, setup } from 'xstate';
import { applicationLifecycleMachine } from '../application/application.service.lifecycle';
import { OrgCommunityGateService } from './org.community.gate.service';

@Injectable()
export class RoleSetServiceLifecycleApplication {
  private applicationMachine: AnyStateMachine;
  constructor(
    private orgCommunityGate: OrgCommunityGateService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    this.applicationMachine = this.getMachine();
  }

  public getApplicationMachine(): AnyStateMachine {
    return this.applicationMachine;
  }

  private getMachine(): AnyStateMachine {
    const machine = setup({
      guards: {
        // UPDATE privilege is used to manage lifecycle transitions, EXCEPT those related to approving which require GRANT.
        // Both also admit Platform Support on an organization's applications,
        // through the same Community-tab gate the resolver uses.
        hasUpdatePrivilege: ({ event }) => {
          const actorContext: ActorContext = event.actorContext;
          const authorizationPolicy: IAuthorizationPolicy = event.authorization;
          return (
            this.orgCommunityGate.resolveBranch(
              actorContext,
              authorizationPolicy,
              AuthorizationPrivilege.UPDATE
            ) !== undefined
          );
        },
        hasGrantPrivilege: ({ event }) => {
          const actorContext: ActorContext = event.actorContext;
          const authorizationPolicy: IAuthorizationPolicy = event.authorization;
          return (
            this.orgCommunityGate.resolveBranch(
              actorContext,
              authorizationPolicy,
              AuthorizationPrivilege.GRANT
            ) !== undefined
          );
        },
      },
    });
    return machine.createMachine(applicationLifecycleMachine);
  }
}
