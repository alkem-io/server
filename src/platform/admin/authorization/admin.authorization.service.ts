import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IUser } from '@domain/community/user';
import { UserService } from '@domain/community/user/user.service';
import {
  LogContext,
  AuthorizationCredential,
  AuthorizationPrivilege,
  AuthorizationRoleGlobal,
} from '@common/enums';
import { ForbiddenException, ValidationException } from '@common/exceptions';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AssignGlobalAdminInput } from '@platform/admin/authorization/dto/authorization.dto.assign.global.admin';
import { RemoveGlobalAdminInput } from '@platform/admin/authorization/dto/authorization.dto.remove.global.admin';
import { AssignGlobalCommunityAdminInput } from '@platform/admin/authorization/dto/authorization.dto.assign.global.community.admin';
import { RemoveGlobalCommunityAdminInput } from '@platform/admin/authorization/dto/authorization.dto.remove.global.community.admin';
import { UserAuthorizationPrivilegesInput } from '@platform/admin/authorization/dto/authorization.dto.user.authorization.privileges';
import { GrantAuthorizationCredentialInput } from './dto/authorization.dto.credential.grant';
import { RevokeAuthorizationCredentialInput } from './dto/authorization.dto.credential.revoke';
import { UsersWithAuthorizationCredentialInput } from './dto/authorization.dto.users.with.credential';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AgentInfo } from '@core/authentication';
import { AssignGlobalSpacesAdminInput } from './dto/authorization.dto.assign.global.spaces.admin';
import { RemoveGlobalSpacesAdminInput } from './dto/authorization.dto.remove.global.spaces.admin';
import { IOrganization } from '@domain/community/organization';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { RevokeOrganizationAuthorizationCredentialInput } from './dto/authorization.dto.credential.revoke.organization';
import { GrantOrganizationAuthorizationCredentialInput } from './dto/authorization.dto.credential.grant.organization';

@Injectable()
export class AdminAuthorizationService {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private agentService: AgentService,
    private userService: UserService,
    private organizationService: OrganizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async assignGlobalAdmin(assignData: AssignGlobalAdminInput): Promise<IUser> {
    const agent = await this.userService.getAgent(assignData.userID);

    // assign the credential
    await this.agentService.grantCredential({
      agentID: agent.id,
      type: AuthorizationCredential.GLOBAL_ADMIN,
      resourceID: '',
    });

    return await this.userService.getUserWithAgent(assignData.userID);
  }

  async removeGlobalAdmin(removeData: RemoveGlobalAdminInput): Promise<IUser> {
    const agent = await this.userService.getAgent(removeData.userID);

    // Check not the last global admin
    await this.removeValidationSingleGlobalAdmin();

    await this.agentService.revokeCredential({
      agentID: agent.id,
      type: AuthorizationCredential.GLOBAL_ADMIN,
      resourceID: '',
    });

    return await this.userService.getUserWithAgent(removeData.userID);
  }

  async assignGlobalCommunityAdmin(
    assignData: AssignGlobalCommunityAdminInput
  ): Promise<IUser> {
    const agent = await this.userService.getAgent(assignData.userID);

    // assign the credential
    await this.agentService.grantCredential({
      agentID: agent.id,
      type: AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY,
      resourceID: '',
    });

    return await this.userService.getUserWithAgent(assignData.userID);
  }

  async removeGlobalCommunityAdmin(
    removeData: RemoveGlobalCommunityAdminInput
  ): Promise<IUser> {
    const agent = await this.userService.getAgent(removeData.userID);

    await this.agentService.revokeCredential({
      agentID: agent.id,
      type: AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY,
      resourceID: '',
    });

    return await this.userService.getUserWithAgent(removeData.userID);
  }

  async assignGlobalSpacesAdmin(
    assignData: AssignGlobalSpacesAdminInput
  ): Promise<IUser> {
    const agent = await this.userService.getAgent(assignData.userID);

    // assign the credential
    await this.agentService.grantCredential({
      agentID: agent.id,
      type: AuthorizationCredential.GLOBAL_ADMIN_SPACES,
      resourceID: '',
    });

    return await this.userService.getUserWithAgent(assignData.userID);
  }

  async removeGlobalSpacesAdmin(
    removeData: RemoveGlobalSpacesAdminInput
  ): Promise<IUser> {
    const agent = await this.userService.getAgent(removeData.userID);

    await this.agentService.revokeCredential({
      agentID: agent.id,
      type: AuthorizationCredential.GLOBAL_ADMIN_SPACES,
      resourceID: '',
    });

    return await this.userService.getUserWithAgent(removeData.userID);
  }

  async removeValidationSingleGlobalAdmin(): Promise<boolean> {
    // Check more than one
    const globalAdmins = await this.usersWithCredentials({
      type: AuthorizationCredential.GLOBAL_ADMIN,
    });
    if (globalAdmins.length < 2)
      throw new ForbiddenException(
        `Not allowed to remove ${AuthorizationCredential.GLOBAL_ADMIN}: last global-admin`,
        LogContext.AUTH
      );

    return true;
  }

  async usersWithCredentials(
    credentialCriteria: UsersWithAuthorizationCredentialInput
  ): Promise<IUser[]> {
    if (!this.isAuthorizationCredential(credentialCriteria.type))
      throw new ValidationException(
        `Invalid type provided: ${credentialCriteria.type}`,
        LogContext.AUTH
      );

    return await this.userService.usersWithCredentials({
      type: credentialCriteria.type.toString(),
      resourceID: credentialCriteria.resourceID,
    });
  }

  async userAuthorizationPrivileges(
    agentInfo: AgentInfo,
    userAuthorizationPrivilegesData: UserAuthorizationPrivilegesInput
  ): Promise<AuthorizationPrivilege[]> {
    // get the user
    const { credentials } = await this.userService.getUserAndCredentials(
      userAuthorizationPrivilegesData.userID
    );

    const authorizationPolicy =
      await this.authorizationPolicyService.getAuthorizationPolicyOrFail(
        userAuthorizationPrivilegesData.authorizationID
      );

    const privileges = await this.authorizationService.getGrantedPrivileges(
      credentials,
      agentInfo.verifiedCredentials,
      authorizationPolicy
    );
    return privileges;
  }

  async grantCredentialToUser(
    grantCredentialData: GrantAuthorizationCredentialInput
  ): Promise<IUser> {
    // check the inputs
    if (this.isGlobalAuthorizationCredential(grantCredentialData.type)) {
      if (grantCredentialData.resourceID)
        throw new ForbiddenException(
          `resourceID should not be specified for global AuthorizationCredentials: ${grantCredentialData.type}`,
          LogContext.AUTH
        );
    }
    const { user, agent } = await this.userService.getUserAndAgent(
      grantCredentialData.userID
    );

    user.agent = await this.agentService.grantCredential({
      agentID: agent.id,
      type: grantCredentialData.type,
      resourceID: grantCredentialData.resourceID,
    });
    return user;
  }

  async revokeCredentialFromUser(
    revokeCredentialData: RevokeAuthorizationCredentialInput
  ): Promise<IUser> {
    // check the inputs
    if (this.isGlobalAuthorizationCredential(revokeCredentialData.type)) {
      if (revokeCredentialData.resourceID)
        throw new ForbiddenException(
          `resourceID should not be specified for global AuthorizationCredentials: ${revokeCredentialData.type}`,
          LogContext.AUTH
        );
    }

    const { user, agent } = await this.userService.getUserAndAgent(
      revokeCredentialData.userID
    );

    user.agent = await this.agentService.revokeCredential({
      agentID: agent.id,
      type: revokeCredentialData.type,
      resourceID: revokeCredentialData.resourceID,
    });

    return user;
  }

  async grantCredentialToOrganization(
    grantCredentialData: GrantOrganizationAuthorizationCredentialInput
  ): Promise<IOrganization> {
    // check the inputs
    if (this.isGlobalAuthorizationCredential(grantCredentialData.type)) {
      if (grantCredentialData.resourceID)
        throw new ForbiddenException(
          `resourceID should not be specified for global AuthorizationCredentials: ${grantCredentialData.type}`,
          LogContext.AUTH
        );
    }
    const { organization, agent } =
      await this.organizationService.getOrganizationAndAgent(
        grantCredentialData.organizationID
      );

    organization.agent = await this.agentService.grantCredential({
      agentID: agent.id,
      type: grantCredentialData.type,
      resourceID: grantCredentialData.resourceID,
    });
    return organization;
  }

  async revokeCredentialFromOrganization(
    revokeCredentialData: RevokeOrganizationAuthorizationCredentialInput
  ): Promise<IOrganization> {
    // check the inputs
    if (this.isGlobalAuthorizationCredential(revokeCredentialData.type)) {
      if (revokeCredentialData.resourceID)
        throw new ForbiddenException(
          `resourceID should not be specified for global AuthorizationCredentials: ${revokeCredentialData.type}`,
          LogContext.AUTH
        );
    }

    const { organization, agent } =
      await this.organizationService.getOrganizationAndAgent(
        revokeCredentialData.organizationID
      );

    organization.agent = await this.agentService.revokeCredential({
      agentID: agent.id,
      type: revokeCredentialData.type,
      resourceID: revokeCredentialData.resourceID || '',
    });

    return organization;
  }

  isGlobalAuthorizationCredential(credentialType: string): boolean {
    const values = Object.values(AuthorizationRoleGlobal);
    const match = values.find(value => value.toString() === credentialType);
    if (match) return true;
    return false;
  }

  isAuthorizationCredential(credentialType: string): boolean {
    const values = Object.values(AuthorizationCredential);
    const match = values.find(value => value.toString() === credentialType);
    if (match) return true;
    return false;
  }
}
