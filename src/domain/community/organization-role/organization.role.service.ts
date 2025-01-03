import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ForbiddenException } from '@common/exceptions';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { IUser } from '@domain/community/user/user.interface';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { IOrganization } from '../organization/organization.interface';
import { OrganizationLookupService } from '../organization-lookup/organization.lookup.service';
import { UserLookupService } from '../user-lookup/user.lookup.service';
import { RoleType } from '@common/enums/role.type';
import { RemoveOrganizationRoleFromUserInput } from './dto/organization.role.dto.remove.role.from.user';
import { AssignOrganizationRoleToUserInput } from './dto/organization.role.dto.assign.role.to.user';

@Injectable()
export class OrganizationRoleService {
  constructor(
    private userLookupService: UserLookupService,
    private agentService: AgentService,
    private organizationLookupService: OrganizationLookupService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async removeAllRoles(organization: IOrganization): Promise<void> {
    // Start by removing all issued org owner credentials in case this causes issues
    const owners = await this.getOwners(organization);
    for (const owner of owners) {
      await this.removeRoleFromUser(
        {
          userID: owner.id,
          organizationID: organization.id,
          role: RoleType.OWNER,
        },
        false
      );
    }

    // Remove all issued membership credentials
    const members = await this.getAssociates(organization);
    for (const member of members) {
      await this.removeRoleFromUser({
        userID: member.id,
        organizationID: organization.id,
        role: RoleType.ASSOCIATE,
      });
    }

    // Remove all issued org admin credentials
    const admins = await this.getAdmins(organization);
    for (const admin of admins) {
      await this.removeRoleFromUser({
        userID: admin.id,
        organizationID: organization.id,
        role: RoleType.ADMIN,
      });
    }
  }

  private getCredentialForRole(
    role: RoleType,
    organizationID: string
  ): ICredentialDefinition {
    const result: ICredentialDefinition = {
      type: '',
      resourceID: organizationID,
    };
    switch (role) {
      case RoleType.ASSOCIATE:
        result.type = AuthorizationCredential.ORGANIZATION_ASSOCIATE;
        break;
      case RoleType.ADMIN:
        result.type = AuthorizationCredential.ORGANIZATION_ADMIN;
        break;
      case RoleType.OWNER:
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
    return await this.userLookupService.usersWithCredentials({
      type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
      resourceID: organization.id,
    });
  }

  async getAdmins(organization: IOrganization): Promise<IUser[]> {
    return await this.userLookupService.usersWithCredentials({
      type: AuthorizationCredential.ORGANIZATION_ADMIN,
      resourceID: organization.id,
    });
  }

  async getOwners(organization: IOrganization): Promise<IUser[]> {
    return await this.userLookupService.usersWithCredentials({
      type: AuthorizationCredential.ORGANIZATION_OWNER,
      resourceID: organization.id,
    });
  }

  async getMyRoles(
    agentInfo: AgentInfo,
    organization: IOrganization
  ): Promise<RoleType[]> {
    // Note: this code can clearly be optimized so that we hit the db once, but
    // for a first pass this should be ok
    const result: RoleType[] = [];
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
    if (isOwner) result.push(RoleType.OWNER);
    if (isAdmin) result.push(RoleType.ADMIN);
    if (isAssociate) result.push(RoleType.ASSOCIATE);

    return result;
  }

  async assignRoleToUser(
    assignData: AssignOrganizationRoleToUserInput
  ): Promise<IUser> {
    const userID = assignData.userID;
    const { agent } = await this.userLookupService.getUserAndAgent(userID);
    const organization =
      await this.organizationLookupService.getOrganizationOrFail(
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

    return await this.userLookupService.getUserWithAgent(userID);
  }

  async removeRoleFromUser(
    removeData: RemoveOrganizationRoleFromUserInput,
    validationRoles = true
  ): Promise<IUser> {
    const organizationID = removeData.organizationID;
    const organization =
      await this.organizationLookupService.getOrganizationOrFail(
        organizationID
      );
    const { agent } = await this.userLookupService.getUserAndAgent(
      removeData.userID
    );

    if (validationRoles) {
      if (removeData.role === RoleType.OWNER) {
        const orgOwners = await this.userLookupService.usersWithCredentials({
          type: AuthorizationCredential.ORGANIZATION_OWNER,
          resourceID: organizationID,
        });
        if (orgOwners.length === 1)
          throw new ForbiddenException(
            `Not allowed to remove last owner for Organization: ${organization.id}`,
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

    return await this.userLookupService.getUserWithAgent(removeData.userID);
  }
}
