import {
  IApplication,
  ApplicationEventInput,
} from '@domain/community/application';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MachineOptions } from 'xstate';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { ApplicationService } from '@domain/community/application/application.service';
import { EntityNotInitializedException } from '@common/exceptions';
import { CommunityService } from './community.service';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { CommunityRole } from '@common/enums/community.role';

@Injectable()
export class CommunityApplicationLifecycleOptionsProvider {
  constructor(
    private lifecycleService: LifecycleService,
    private communityService: CommunityService,
    private authorizationService: AuthorizationService,
    private applicationService: ApplicationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async eventOnApplication(
    applicationEventData: ApplicationEventInput,
    agentInfo: AgentInfo
  ): Promise<IApplication> {
    const applicationID = applicationEventData.applicationID;
    const application = await this.applicationService.getApplicationOrFail(
      applicationID
    );

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
    await this.lifecycleService.event(
      {
        ID: application.lifecycle.id,
        eventName: applicationEventData.eventName,
      },
      this.applicationLifecycleMachineOptions,
      agentInfo,
      application.authorization
    );

    return await this.applicationService.getApplicationOrFail(applicationID);
  }

  private applicationLifecycleMachineOptions: Partial<
    MachineOptions<any, any>
  > = {
    actions: {
      communityAddMember: async (_, event: any) => {
        const application = await this.applicationService.getApplicationOrFail(
          event.parentID,
          {
            relations: { community: true, user: true },
          }
        );
        const userID = application.user?.id;
        const community = application.community;
        if (!userID || !community)
          throw new EntityNotInitializedException(
            `Lifecycle not initialized on Application: ${application.id}`,
            LogContext.COMMUNITY
          );

        await this.communityService.assignUserToRole(
          community,
          userID,
          CommunityRole.MEMBER,
          event.agentInfo,
          true
        );
      },
    },
    guards: {
      communityUpdateAuthorized: (_, event) => {
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
