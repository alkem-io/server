import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MachineOptions } from 'xstate';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { EntityNotInitializedException } from '@common/exceptions';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { CommunityRoleType } from '@common/enums/community.role';
import { InvitationEventInput } from '@domain/access/invitation/dto/invitation.dto.event';
import { IInvitation } from '@domain/access/invitation/invitation.interface';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { RoleSetService } from './role.set.service';

@Injectable()
export class RoleSetInvitationLifecycleOptionsProvider {
  constructor(
    private lifecycleService: LifecycleService,
    private authorizationService: AuthorizationService,
    private invitationService: InvitationService,
    private roleSetService: RoleSetService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async eventOnInvitation(
    invitationEventData: InvitationEventInput,
    agentInfo: AgentInfo
  ): Promise<IInvitation> {
    const invitationID = invitationEventData.invitationID;
    const invitation =
      await this.invitationService.getInvitationOrFail(invitationID);

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

    const { options, ready } = this.getInvitationLifecycleMachineOptions();

    await this.lifecycleService.event(
      {
        ID: invitation.lifecycle.id,
        eventName: invitationEventData.eventName,
      },
      options,
      agentInfo,
      invitation.authorization
    );

    await ready();

    return await this.invitationService.getInvitationOrFail(invitationID);
  }

  private getInvitationLifecycleMachineOptions(): {
    options: Partial<MachineOptions<any, any>>;
    ready: () => Promise<void>;
  } {
    let resolve: (value: void) => void;

    const readyPromise = new Promise<void>(r => {
      resolve = r;
    });

    let readyState = true;

    const getReadiness = () => {
      if (readyState) {
        return Promise.resolve();
      }
      return readyPromise;
    };

    const options: Partial<MachineOptions<any, any>> = {
      actions: {
        communityAddMember: async (_, event: any) => {
          readyState = false;
          try {
            const invitation = await this.invitationService.getInvitationOrFail(
              event.parentID,
              {
                relations: {
                  roleSet: {
                    parentRoleSet: true,
                  },
                },
              }
            );
            const contributorID = invitation.invitedContributor;
            const roleSet = invitation.roleSet;
            if (!contributorID || !roleSet) {
              throw new EntityNotInitializedException(
                `Lifecycle not initialized on Invitation: ${invitation.id}`,
                LogContext.COMMUNITY
              );
            }

            if (invitation.invitedToParent) {
              if (!roleSet.parentRoleSet) {
                throw new EntityNotInitializedException(
                  `Unable to load parent community when flag to add is set: ${invitation.id}`,
                  LogContext.COMMUNITY
                );
              }
              await this.roleSetService.assignContributorToRole(
                roleSet.parentRoleSet,
                CommunityRoleType.MEMBER,
                contributorID,
                invitation.contributorType,
                event.agentInfo,
                true
              );
            }
            await this.roleSetService.assignContributorToRole(
              roleSet,
              CommunityRoleType.MEMBER,
              contributorID,
              invitation.contributorType,
              event.agentInfo,
              true
            );
            if (invitation.extraRole) {
              await this.roleSetService.assignContributorToRole(
                roleSet,
                invitation.extraRole,
                contributorID,
                invitation.contributorType,
                event.agentInfo,
                false
              );
            }
          } finally {
            resolve();
          }
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

    return {
      options,
      ready: getReadiness,
    };
  }
}
