import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  ForbiddenException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { IUser } from '@domain/community/user/user.interface';
import { UserService } from '@domain/community/user/user.service';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { OrganizationRole } from '@common/enums/organization.role';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { AssignOrganizationRoleToUserInput } from './dto/organization.role.dto.assign.role.to.user';
import { RemoveOrganizationRoleFromUserInput } from './dto/organization.role.dto.remove.role.from.user';
import { IOrganization } from '../organization/organization.interface';
import { ContributorLookupService } from '@services/infrastructure/contributor-lookup/contributor.lookup.service';

@Injectable()
export class OrganizationRoleService {
  constructor(
    private userService: UserService,
    private agentService: AgentService,
    private contributorLookupService: ContributorLookupService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async removeAllRoles(organization: IOrganization): Promise<void> {
    // Start by removing all issued org owner credentials in case this causes issues
    const owners = await this.getOwners(organization);
    for (const owner of owners) {
      await this.removeOrganizationRoleFromUser(
        {
          userID: owner.id,
          organizationID: organization.id,
          role: OrganizationRole.OWNER,
        },
        false
      );
    }

    // Remove all issued membership credentials
    const members = await this.getAssociates(organization);
    for (const member of members) {
      await this.removeOrganizationRoleFromUser({
        userID: member.id,
        organizationID: organization.id,
        role: OrganizationRole.ASSOCIATE,
      });
    }

    // Remove all issued org admin credentials
    const admins = await this.getAdmins(organization);
    for (const admin of admins) {
      await this.removeOrganizationRoleFromUser({
        userID: admin.id,
        organizationID: organization.id,
        role: OrganizationRole.ADMIN,
      });
    }
  }

  async isAccountHost(organization: IOrganization): Promise<boolean> {
    if (!organization.agent)
      throw new RelationshipNotFoundException(
        `Unable to load agent for organization: ${organization.id}`,
        LogContext.COMMUNITY
      );

    return await this.agentService.hasValidCredential(organization.agent.id, {
      type: AuthorizationCredential.ACCOUNT_HOST,
    });
  }

  private getCredentialForRole(
    role: OrganizationRole,
    organizationID: string
  ): ICredentialDefinition {
    const result: ICredentialDefinition = {
      type: '',
      resourceID: organizationID,
    };
    switch (role) {
      case OrganizationRole.ASSOCIATE:
        result.type = AuthorizationCredential.ORGANIZATION_ASSOCIATE;
        break;
      case OrganizationRole.ADMIN:
        result.type = AuthorizationCredential.ORGANIZATION_ADMIN;
        break;
      case OrganizationRole.OWNER:
        result.type = AuthorizationCredential.ORGANIZATION_OWNER;
        break;

      default:
        throw new ForbiddenException(
          `Role not supported: ${role}`,
          LogContext.AUTH
        );
    }
    return result;
  }

  async getMembersCount(organization: IOrganization): Promise<number> {
    const credentialMatches =
      await this.agentService.countAgentsWithMatchingCredentials({
        type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
        resourceID: organization.id,
      });

    return credentialMatches;
  }

  async getAssociates(organization: IOrganization): Promise<IUser[]> {
    return await this.userService.usersWithCredentials({
      type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
      resourceID: organization.id,
    });
  }

  async getAdmins(organization: IOrganization): Promise<IUser[]> {
    return await this.userService.usersWithCredentials({
      type: AuthorizationCredential.ORGANIZATION_ADMIN,
      resourceID: organization.id,
    });
  }

  async getOwners(organization: IOrganization): Promise<IUser[]> {
    return await this.userService.usersWithCredentials({
      type: AuthorizationCredential.ORGANIZATION_OWNER,
      resourceID: organization.id,
    });
  }

  async getMyRoles(
    agentInfo: AgentInfo,
    organization: IOrganization
  ): Promise<OrganizationRole[]> {
    // Note: this code can clearly be optimized so that we hit the db once, but
    // for a first pass this should be ok
    const result: OrganizationRole[] = [];
    const agent = await this.agentService.getAgentOrFail(agentInfo.agentID);

    const isAdmin = await this.agentService.hasValidCredential(agent.id, {
      type: AuthorizationCredential.ORGANIZATION_ADMIN,
      resourceID: organization.id,
    });
    const isAssociate = await this.agentService.hasValidCredential(agent.id, {
      type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
      resourceID: organization.id,
    });
    const isOwner = await this.agentService.hasValidCredential(agent.id, {
      type: AuthorizationCredential.ORGANIZATION_OWNER,
      resourceID: organization.id,
    });
    if (isOwner) result.push(OrganizationRole.OWNER);
    if (isAdmin) result.push(OrganizationRole.ADMIN);
    if (isAssociate) result.push(OrganizationRole.ASSOCIATE);

    return result;
  }

  async assignOrganizationRoleToUser(
    assignData: AssignOrganizationRoleToUserInput
  ): Promise<IUser> {
    const userID = assignData.userID;
    const agent = await this.userService.getAgent(userID);
    const organization =
      await this.contributorLookupService.getOrganizationOrFail(
        assignData.organizationID
      );

    const credential = this.getCredentialForRole(
      assignData.role,
      organization.id
    );

    await this.agentService.grantCredential({
      agentID: agent.id,
      ...credential,
    });

    return await this.userService.getUserWithAgent(userID);
  }

  async removeOrganizationRoleFromUser(
    removeData: RemoveOrganizationRoleFromUserInput,
    validationRoles = true
  ): Promise<IUser> {
    const organizationID = removeData.organizationID;
    const organization =
      await this.contributorLookupService.getOrganizationOrFail(organizationID);
    const agent = await this.userService.getAgent(removeData.userID);

    if (validationRoles) {
      if (removeData.role === OrganizationRole.OWNER) {
        const orgOwners = await this.userService.usersWithCredentials({
          type: AuthorizationCredential.ORGANIZATION_OWNER,
          resourceID: organizationID,
        });
        if (orgOwners.length === 1)
          throw new ForbiddenException(
            `Not allowed to remove last owner for organisaiton: ${organization.nameID}`,
            LogContext.AUTH
          );
      }
    }

    const credential = this.getCredentialForRole(
      removeData.role,
      organization.id
    );

    await this.agentService.revokeCredential({
      agentID: agent.id,
      ...credential,
    });

    return await this.userService.getUserWithAgent(removeData.userID);
  }
}
