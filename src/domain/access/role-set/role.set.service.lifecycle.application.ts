import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AnyStateMachine, setup } from 'xstate';
import { applicationLifecycleMachine } from '../application/application.service.lifecycle';

@Injectable()
export class RoleSetServiceLifecycleApplication {
  private applicationMachine: AnyStateMachine;
  constructor(
    private authorizationService: AuthorizationService,
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
        // UPDATE privilege is used to manage lifecycle transitions, EXCEPT those related to approving which require GRANT
        hasUpdatePrivilege: ({ event }) => {
          const agentInfo: AgentInfo = event.agentInfo;
          const authorizationPolicy: IAuthorizationPolicy = event.authorization;
          return this.authorizationService.isAccessGranted(
            agentInfo,
            authorizationPolicy,
            AuthorizationPrivilege.UPDATE
          );
        },
        hasGrantPrivilege: ({ event }) => {
          const agentInfo: AgentInfo = event.agentInfo;
          const authorizationPolicy: IAuthorizationPolicy = event.authorization;
          return this.authorizationService.isAccessGranted(
            agentInfo,
            authorizationPolicy,
            AuthorizationPrivilege.GRANT
          );
        },
      },
    });
    return machine.createMachine(applicationLifecycleMachine);
  }
}
