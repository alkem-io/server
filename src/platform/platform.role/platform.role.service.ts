import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ForbiddenException } from '@common/exceptions/forbidden.exception';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { RemovePlatformRoleFromUserInput } from './dto/platform.dto.remove.role.user';
import { IUser } from '@domain/community/user/user.interface';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AssignPlatformRoleToUserInput } from './dto/platform.dto.assign.role.user';
import { CreatePlatformInvitationInput } from '@platform/invitation/dto/platform.invitation.dto.create';
import { IPlatformInvitation } from '@platform/invitation/platform.invitation.interface';
import { PlatformInvitationService } from '@platform/invitation/platform.invitation.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { PlatformService } from '@platform/platform/platform.service';
import { RelationshipNotFoundException } from '@common/exceptions';
import { AccountService } from '@domain/space/account/account.service';
import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credential.based.credential.type';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { RoleName } from '@common/enums/role.name';

@Injectable()
export class PlatformRoleService {
  constructor(
    private userLookupService: UserLookupService,
    private accountService: AccountService,
    private agentService: AgentService,
    private platformService: PlatformService,
    private platformInvitationService: PlatformInvitationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createPlatformInvitation(
    platformInvitationData: CreatePlatformInvitationInput,
    agentInfo: AgentInfo
  ): Promise<IPlatformInvitation> {
    const platform = await this.platformService.getPlatformOrFail({
      relations: { platformInvitations: true },
    });
    if (!platform.platformInvitations) {
      throw new EntityNotFoundException(
        'No Platform Invitation found!',
        LogContext.PLATFORM
      );
    }
    platformInvitationData.createdBy = agentInfo.userID;
    const platformInvitation =
      await this.platformInvitationService.createPlatformInvitation(
        platformInvitationData
      );
    platformInvitation.platform = platform;
    return await this.platformInvitationService.save(platformInvitation);
  }

  async getPlatformInvitationsForRole(): Promise<IPlatformInvitation[]> {
    const platform = await this.platformService.getPlatformOrFail({
      relations: { platformInvitations: true },
    });
    if (!platform.platformInvitations) {
      throw new EntityNotFoundException(
        'No Platform Invitation found!',
        LogContext.PLATFORM
      );
    }
    return platform.platformInvitations;
  }

  public async assignPlatformRoleToUser(
    assignData: AssignPlatformRoleToUserInput
  ): Promise<IUser> {
    const user = await this.userLookupService.getUserOrFail(assignData.userID, {
      relations: {
        agent: true,
      },
    });

    if (!user.agent) {
      throw new RelationshipNotFoundException(
        `Unable to retrieve Agent for User: ${user.id}`,
        LogContext.PLATFORM
      );
    }

    const credential = this.getCredentialForRole(assignData.role);

    // assign the credential
    await this.agentService.grantCredential({
      agentID: user.agent.id,
      ...credential,
    });

    if (
      assignData.role === RoleName.PLATFORM_BETA_TESTER ||
      assignData.role === RoleName.PLATFORM_VC_CAMPAIGN
    ) {
      // Also assign the user account a license plan
      const accountAgent = await this.accountService.getAgent(user.accountID);

      const accountLicenseCredential: ICredentialDefinition = {
        type: LicensingCredentialBasedCredentialType.ACCOUNT_LICENSE_PLUS,
        resourceID: user.accountID,
      };
      await this.agentService.grantCredential({
        agentID: accountAgent.id,
        ...accountLicenseCredential,
      });
    }

    return await this.userLookupService.getUserWithAgent(assignData.userID);
  }

  public async removePlatformRoleFromUser(
    removeData: RemovePlatformRoleFromUserInput
  ): Promise<IUser> {
    const user = await this.userLookupService.getUserOrFail(removeData.userID, {
      relations: {
        agent: true,
      },
    });

    if (!user.agent) {
      throw new RelationshipNotFoundException(
        `Unable to retrieve Agent for User: ${user.id}`,
        LogContext.PLATFORM
      );
    }

    // Validation logic
    if (removeData.role === RoleName.GLOBAL_ADMIN) {
      // Check not the last global admin
      await this.removeValidationSingleGlobalAdmin();
    }

    const credential = this.getCredentialForRole(removeData.role);

    await this.agentService.revokeCredential({
      agentID: user.agent.id,
      ...credential,
    });

    if (
      removeData.role === RoleName.PLATFORM_BETA_TESTER ||
      removeData.role === RoleName.PLATFORM_VC_CAMPAIGN
    ) {
      // Also assign the user account a license plan
      const accountAgent = await this.accountService.getAgent(user.accountID);
      const accountLicenseCredential: ICredentialDefinition = {
        type: LicensingCredentialBasedCredentialType.ACCOUNT_LICENSE_PLUS,
        resourceID: user.accountID,
      };
      await this.agentService.revokeCredential({
        agentID: accountAgent.id,
        ...accountLicenseCredential,
      });
    }

    return await this.userLookupService.getUserWithAgent(removeData.userID);
  }

  private async removeValidationSingleGlobalAdmin(): Promise<boolean> {
    // Check more than one
    const globalAdmins = await this.userLookupService.usersWithCredentials({
      type: AuthorizationCredential.GLOBAL_ADMIN,
    });
    if (globalAdmins.length < 2)
      throw new ForbiddenException(
        `Not allowed to remove ${AuthorizationCredential.GLOBAL_ADMIN}: last global-admin`,
        LogContext.AUTH
      );

    return true;
  }

  async getPlatformRoles(agentInfo: AgentInfo): Promise<RoleName[]> {
    const result: RoleName[] = [];
    const agent = await this.agentService.getAgentOrFail(agentInfo.agentID);
    const roles: RoleName[] = Object.values(RoleName) as RoleName[];
    for (const role of roles) {
      const hasAgentRole = await this.isInRole(agent, role);
      if (hasAgentRole) {
        result.push(role);
      }
    }

    return result;
  }

  public async getPlatformRolesForUser(userID: string): Promise<RoleName[]> {
    const result: RoleName[] = [];
    const { agent } = await this.userLookupService.getUserAndAgent(userID);
    const roles: RoleName[] = Object.values(RoleName) as RoleName[];
    for (const role of roles) {
      const hasAgentRole = await this.isInRole(agent, role);
      if (hasAgentRole) {
        result.push(role);
      }
    }

    return result;
  }

  public async getPlatformRolesForUsers(
    userIDs: string[]
  ): Promise<{ [userID: string]: RoleName[] }> {
    // Retrieve all agents for the provided user IDs in a single query
    const usersWithAgents =
      await this.userLookupService.getUsersWithAgent(userIDs);

    // Initialize a result map to store roles for each user
    const userRolesMap: { [userID: string]: RoleName[] } = {};

    // Iterate over each agent and determine their roles
    for (const { id: userID, agent } of usersWithAgents) {
      const roles: RoleName[] = [];
      for (const platformRole of Object.values(RoleName)) {
        if (await this.isInRole(agent, platformRole)) {
          roles.push(platformRole);
        }
      }
      userRolesMap[userID] = roles;
    }

    return userRolesMap;
  }

  private async isInRole(agent: IAgent, role: RoleName): Promise<boolean> {
    const membershipCredential = this.getCredentialForRole(role);

    const validCredential = await this.agentService.hasValidCredential(
      agent.id,
      {
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      }
    );
    return validCredential;
  }

  private getCredentialForRole(role: RoleName): ICredentialDefinition {
    const result: ICredentialDefinition = {
      type: '',
      resourceID: '',
    };
    switch (role) {
      case RoleName.GLOBAL_ADMIN:
        result.type = AuthorizationCredential.GLOBAL_ADMIN;
        break;
      case RoleName.GLOBAL_SUPPORT:
        result.type = AuthorizationCredential.GLOBAL_SUPPORT;
        break;
      case RoleName.GLOBAL_LICENSE_MANAGER:
        result.type = AuthorizationCredential.GLOBAL_LICENSE_MANAGER;
        break;
      case RoleName.GLOBAL_COMMUNITY_READER:
        result.type = AuthorizationCredential.GLOBAL_COMMUNITY_READ;
        break;
      case RoleName.GLOBAL_SPACES_READER:
        result.type = AuthorizationCredential.GLOBAL_SPACES_READER;
        break;
      case RoleName.PLATFORM_BETA_TESTER:
        result.type = AuthorizationCredential.BETA_TESTER;
        break;
      case RoleName.PLATFORM_VC_CAMPAIGN:
        result.type = AuthorizationCredential.VC_CAMPAIGN;
        break;
      default:
        throw new ForbiddenException(
          `Role not supported: ${role}`,
          LogContext.AUTH
        );
    }
    return result;
  }
}
