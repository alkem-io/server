import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityNotInitializedException } from '@common/exceptions';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { CommunityRoleType } from '@common/enums/community.role';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { RoleSetService } from './role.set.service';
import { AnyStateMachine, setup } from 'xstate';

@Injectable()
export class RoleSetServiceLifecycleInvitation {
  private invitationMachine: AnyStateMachine;
  constructor(
    private authorizationService: AuthorizationService,
    private invitationService: InvitationService,
    private roleSetService: RoleSetService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    this.invitationMachine = this.getMachine();
  }

  public getInvitationMachine(): AnyStateMachine {
    return this.invitationMachine;
  }

  private getMachine(): AnyStateMachine {
    const machine = setup({
      actions: {
        actionsPending: ({ context }) => {
          context.actionsPending = true;
          this.logger.verbose?.(
            `actionsPending: ${context.actionsPending}`,
            LogContext.COMMUNITY
          );
        },
        communityAddMember: async ({ context, event }) => {
          this.logger.verbose?.(
            `communityAddMember: ${context.actionsPending}`,
            LogContext.COMMUNITY
          );
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
            const contributorID = invitation.invitedContributorID;
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
          } catch (e) {
            this.logger.error?.(
              `Error adding member to community: ${e}`,
              LogContext.COMMUNITY
            );
            throw new EntityNotInitializedException(
              `Unable to add member to community: ${e}`,
              LogContext.COMMUNITY
            );
          } finally {
            context.actionsPending = false;
          }
        },
      },
      guards: {
        hasUpdatePrivilege: ({ event }) => {
          const agentInfo: AgentInfo = event.agentInfo;
          const authorizationPolicy: AuthorizationPolicy = event.authorization;
          return this.authorizationService.isAccessGranted(
            agentInfo,
            authorizationPolicy,
            AuthorizationPrivilege.UPDATE
          );
        },
        hasInvitationAcceptPrivilege: ({ event }) => {
          const agentInfo: AgentInfo = event.agentInfo;
          const authorizationPolicy: AuthorizationPolicy = event.authorization;
          return this.authorizationService.isAccessGranted(
            agentInfo,
            authorizationPolicy,
            AuthorizationPrivilege.UPDATE //COMMUNITY_INVITE_ACCEPT
          );
        },
      },
    });
    return machine.createMachine({
      id: 'user-invitation',
      context: {
        actionsCompleted: true,
      },
      initial: 'invited',
      states: {
        invited: {
          on: {
            ACCEPT: {
              guard: 'hasInvitationAcceptPrivilege',
              target: 'accepted',
            },
            REJECT: {
              guard: 'hasUpdatePrivilege',
              target: 'rejected',
            },
          },
        },
        accepted: {
          //type: 'final',
          entry: ['actionsPending', 'communityAddMember'],
        },
        rejected: {
          on: {
            REINVITE: {
              guard: 'hasUpdatePrivilege',
              target: 'invited',
            },
            ARCHIVE: {
              guard: 'hasUpdatePrivilege',
              target: 'archived',
            },
          },
        },
        archived: {
          type: 'final',
        },
      },
    });
  }
}
