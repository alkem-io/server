import {
  IApplication,
  ApplicationEventInput,
} from '@domain/community/application';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MachineOptions } from 'xstate';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { ApplicationService } from '@domain/community/application/application.service';
import { EntityNotInitializedException } from '@common/exceptions';
import { CommunityService } from './community.service';
import { ICredential } from '@domain/agent';
import { UserInfo } from '@core/authentication';

@Injectable()
export class CommunityLifecycleOptionsProvider {
  constructor(
    private lifecycleService: LifecycleService,
    private communityService: CommunityService,
    private applicationService: ApplicationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async eventOnApplication(
    applicationEventData: ApplicationEventInput,
    userInfo: UserInfo
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

    const credentials = userInfo.credentials;

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
      credentials
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
            relations: ['community'],
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
        const invokingUserCredentials: ICredential[] = event.credentials;
        for (const credential of invokingUserCredentials) {
          if (
            credential.type === AuthorizationCredential.GlobalAdmin ||
            credential.type === AuthorizationCredential.GlobalAdminCommunity
          ) {
            return true;
          }
        }

        return false;
      },
    },
  };
}
