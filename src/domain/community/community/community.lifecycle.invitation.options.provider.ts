import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MachineOptions } from 'xstate';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { EntityNotInitializedException } from '@common/exceptions';
import { CommunityService } from './community.service';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { CommunityRole } from '@common/enums/community.role';
import { InvitationService } from '../invitation/invitation.service';
import { InvitationEventInput } from '../invitation/dto/invitation.dto.event';
import { IInvitation } from '../invitation';

@Injectable()
export class CommunityInvitationLifecycleOptionsProvider {
  constructor(
    private lifecycleService: LifecycleService,
    private communityService: CommunityService,
    private authorizationService: AuthorizationService,
    private invitationService: InvitationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async eventOnInvitation(
    invitationEventData: InvitationEventInput,
    agentInfo: AgentInfo
  ): Promise<IInvitation> {
    const invitationID = invitationEventData.invitationID;
    const invitation = await this.invitationService.getInvitationOrFail(
      invitationID
    );

    if (!invitation.lifecycle)
      throw new EntityNotInitializedException(
        `Lifecycle not initialized on Invitation: ${invitationID}`,
        LogContext.COMMUNITY
      );

    // Send the event, translated if needed
    this.logger.verbose?.(
      `Event ${invitationEventData.eventName} triggered on invitation: ${invitation.id} using lifecycle ${invitation.lifecycle.id}`,
      LogContext.COMMUNITY
    );
    await this.lifecycleService.event(
      {
        ID: invitation.lifecycle.id,
        eventName: invitationEventData.eventName,
      },
      this.invitationLifecycleMachineOptions,
      agentInfo,
      invitation.authorization
    );

    return await this.invitationService.getInvitationOrFail(invitationID);
  }

  private invitationLifecycleMachineOptions: Partial<MachineOptions<any, any>> =
    {
      actions: {
        communityAddMember: async (_, event: any) => {
          const application = await this.invitationService.getInvitationOrFail(
            event.parentID,
            {
              relations: ['community'],
            }
          );
          const userID = application.invitedUser;
          const community = application.community;
          if (!userID || !community)
            throw new EntityNotInitializedException(
              `Lifecycle not initialized on Application: ${application.id}`,
              LogContext.COMMUNITY
            );

          await this.communityService.assignUserToRole(
            community,
            userID,
            CommunityRole.MEMBER
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
        communityInvitationAcceptAuthorized: (_, event) => {
          const agentInfo: AgentInfo = event.agentInfo;
          const authorizationPolicy: AuthorizationPolicy = event.authorization;
          return this.authorizationService.isAccessGranted(
            agentInfo,
            authorizationPolicy,
            AuthorizationPrivilege.COMMUNITY_INVITE_ACCEPT
          );
        },
      },
    };
}
