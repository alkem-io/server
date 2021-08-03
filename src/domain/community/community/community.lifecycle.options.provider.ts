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
import { AuthorizationEngineService } from '@src/services/platform/authorization-engine/authorization-engine.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';

@Injectable()
export class CommunityLifecycleOptionsProvider {
  constructor(
    private lifecycleService: LifecycleService,
    private communityService: CommunityService,
    private authorizationEngineService: AuthorizationEngineService,
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
            relations: ['community', 'user'],
          }
        );
        const userID = application.user?.id;
        const communityID = application.community?.id;
        if (!userID || !communityID)
          throw new EntityNotInitializedException(
            `Lifecycle not initialized on Application: ${application.id}`,
            LogContext.COMMUNITY
          );

        await this.communityService.assignMember({
          userID: userID,
          communityID: communityID,
        });
      },
    },
    guards: {
      communityUpdateAuthorized: (_, event) => {
        const agentInfo: AgentInfo = event.agentInfo;
        const authorizationPolicy: AuthorizationPolicy = event.authorization;
        return this.authorizationEngineService.isAccessGranted(
          agentInfo,
          authorizationPolicy,
          AuthorizationPrivilege.UPDATE
        );
      },
    },
  };
}
