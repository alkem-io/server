import {
  IApplication,
  ApplicationEventInput,
} from '@domain/access/application';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { ApplicationService } from '@domain/access/application/application.service';
import { EntityNotInitializedException } from '@common/exceptions';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { CommunityRoleType } from '@common/enums/community.role';
import { RoleSetService } from './role.set.service';
import { AnyStateMachine, setup } from 'xstate';

@Injectable()
export class RoleSetApplicationLifecycleOptionsProvider {
  constructor(
    private lifecycleService: LifecycleService,
    private authorizationService: AuthorizationService,
    private applicationService: ApplicationService,
    private roleSetService: RoleSetService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async eventOnApplication(
    applicationEventData: ApplicationEventInput,
    agentInfo: AgentInfo
  ): Promise<IApplication> {
    const applicationID = applicationEventData.applicationID;
    const application =
      await this.applicationService.getApplicationOrFail(applicationID);

    if (!application.lifecycle)
      throw new EntityNotInitializedException(
        `Lifecycle not initialized on Application: ${applicationID}`,
        LogContext.COMMUNITY
      );

    // Send the event, translated if needed
    this.logger.verbose?.(
      `Event ${applicationEventData.eventName} triggered on application: ${application.id} using lifecycle ${application.lifecycle.id}`,
      LogContext.COMMUNITY
    );
    await this.lifecycleService.event({
      machine: this.getMachine(),
      eventName: applicationEventData.eventName,
      lifecycle: application.lifecycle,
      agentInfo,
      authorization: application.authorization,
      parentID: applicationID,
    });

    return await this.applicationService.getApplicationOrFail(applicationID);
  }

  public getMachine(): AnyStateMachine {
    const machine = setup({
      actions: {
        communityAddMember: async ({ event }) => {
          const application =
            await this.applicationService.getApplicationOrFail(event.parentID, {
              relations: { roleSet: true, user: true },
            });
          const userID = application.user?.id;
          const roleSet = application.roleSet;
          if (!userID || !roleSet)
            throw new EntityNotInitializedException(
              `Lifecycle not initialized on Application: ${application.id}`,
              LogContext.COMMUNITY
            );

          await this.roleSetService.assignUserToRole(
            roleSet,
            CommunityRoleType.MEMBER,
            userID,
            event.agentInfo,
            true
          );
        },
      },
      guards: {
        hasUpdatePrivilege: ({ event }) => {
          const agentInfo: AgentInfo = event.agentInfo;
          const authorizationPolicy: IAuthorizationPolicy = event.authorization;
          return this.authorizationService.isAccessGranted(
            agentInfo,
            authorizationPolicy,
            AuthorizationPrivilege.UPDATE
          );
        },
      },
    });
    return machine.createMachine({
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
              guard: 'hasUpdatePrivilege',
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
    });
  }
}
