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
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { CommunityRoleType } from '@common/enums/community.role';
import { RoleSetService } from './role.set.service';

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
      ID: application.lifecycle.id,
      eventName: applicationEventData.eventName,
      actions: this.applicationLifecycleMachineOptions.actions,
      guards: this.applicationLifecycleMachineOptions.guards,
      agentInfo,
      authorization: application.authorization,
    });

    return await this.applicationService.getApplicationOrFail(applicationID);
  }

  private applicationLifecycleMachineOptions: any = {
    actions: {
      communityAddMember: async (_: any, event: any) => {
        const application = await this.applicationService.getApplicationOrFail(
          event.parentID,
          {
            relations: { roleSet: true, user: true },
          }
        );
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
      communityUpdateAuthorized: (
        _: any,
        event: { agentInfo: AgentInfo; authorization: AuthorizationPolicy }
      ) => {
        const agentInfo: AgentInfo = event.agentInfo;
        const authorizationPolicy: AuthorizationPolicy = event.authorization;
        return this.authorizationService.isAccessGranted(
          agentInfo,
          authorizationPolicy,
          AuthorizationPrivilege.UPDATE
        );
      },
    },
  };
}
