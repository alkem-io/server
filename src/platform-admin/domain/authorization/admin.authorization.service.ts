import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IUser } from '@domain/community/user/user.interface';
import {
  LogContext,
  AuthorizationCredential,
  AuthorizationPrivilege,
  AuthorizationRoleGlobal,
} from '@common/enums';
import { ForbiddenException, ValidationException } from '@common/exceptions';
import { ActorService } from '@domain/actor/actor/actor.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { GrantAuthorizationCredentialInput } from './dto/authorization.dto.credential.grant';
import { RevokeAuthorizationCredentialInput } from './dto/authorization.dto.credential.revoke';
import { UsersWithAuthorizationCredentialInput } from '@src/platform-admin/domain/authorization/dto';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ActorContext } from '@core/actor-context';
import { IOrganization } from '@domain/community/organization';
import { RevokeOrganizationAuthorizationCredentialInput } from './dto/authorization.dto.credential.revoke.organization';
import { GrantOrganizationAuthorizationCredentialInput } from './dto/authorization.dto.credential.grant.organization';
import { CREDENTIAL_RULE_TYPES_PLATFORM_GLOBAL_ADMINS } from '@common/constants/authorization/credential.rule.types.constants';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { UserAuthorizationPrivilegesInput } from './dto/authorization.dto.user.authorization.privileges';

@Injectable()
export class AdminAuthorizationService {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private actorService: ActorService,
    private userLookupService: UserLookupService,
    private organizationLookupService: OrganizationLookupService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async usersWithCredentials(
    credentialCriteria: UsersWithAuthorizationCredentialInput
  ): Promise<IUser[]> {
    if (!this.isAuthorizationCredential(credentialCriteria.type))
      throw new ValidationException(
        `Invalid type provided: ${credentialCriteria.type}`,
        LogContext.AUTH
      );

    return await this.userLookupService.usersWithCredential({
      type: credentialCriteria.type.toString(),
      resourceID: credentialCriteria.resourceID,
    });
  }

  async userAuthorizationPrivileges(
    actorContext: ActorContext,
    userAuthorizationPrivilegesData: UserAuthorizationPrivilegesInput
  ): Promise<AuthorizationPrivilege[]> {
    // get the user
    const { credentials } = await this.userLookupService.getUserAndCredentials(
      userAuthorizationPrivilegesData.userID
    );

    const authorizationPolicy =
      await this.authorizationPolicyService.getAuthorizationPolicyOrFail(
        userAuthorizationPrivilegesData.authorizationID
      );

    const privileges = this.authorizationService.getGrantedPrivileges(
      credentials,
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
    const user = await this.userLookupService.getUserByIdOrFail(
      grantCredentialData.userID
    );

    // User IS an Actor - grant credential directly using user.id as actorId
    await this.actorService.grantCredentialOrFail(user.id, {
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

    const user = await this.userLookupService.getUserByIdOrFail(
      revokeCredentialData.userID
    );

    // User IS an Actor - revoke credential directly using user.id as actorId
    await this.actorService.revokeCredential(user.id, {
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
    const organization =
      await this.organizationLookupService.getOrganizationByIdOrFail(
        grantCredentialData.organizationID
      );

    // Organization IS an Actor - grant credential directly using organization.id as actorId
    await this.actorService.grantCredentialOrFail(organization.id, {
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

    const organization =
      await this.organizationLookupService.getOrganizationByIdOrFail(
        revokeCredentialData.organizationID
      );

    // Organization IS an Actor - revoke credential directly using organization.id as actorId
    await this.actorService.revokeCredential(organization.id, {
      type: revokeCredentialData.type,
      resourceID: revokeCredentialData.resourceID || '',
    });

    return organization;
  }

  public async resetAuthorizationPolicy(authorizationID: string) {
    const authorization =
      await this.authorizationPolicyService.getAuthorizationPolicyOrFail(
        authorizationID
      );

    this.authorizationPolicyService.reset(authorization);

    const updatedAuthorization =
      this.extendAuthorizationPolicyWithAuthorizationReset(authorization);

    // Also grant READ, UPDATE, DELETE to global admins
    const globalAdminsReadUpdateDelete =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        [AuthorizationCredential.GLOBAL_ADMIN],
        CREDENTIAL_RULE_TYPES_PLATFORM_GLOBAL_ADMINS
      );
    globalAdminsReadUpdateDelete.cascade = false;

    updatedAuthorization.credentialRules.push(globalAdminsReadUpdateDelete);
    return await this.authorizationPolicyService.save(updatedAuthorization);
  }

  public extendAuthorizationPolicyWithAuthorizationReset(
    authorization: IAuthorizationPolicy
  ) {
    const globalAdminsAuthorizationReset =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.AUTHORIZATION_RESET],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_TYPES_PLATFORM_GLOBAL_ADMINS
      );
    globalAdminsAuthorizationReset.cascade = false;

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      [globalAdminsAuthorizationReset]
    );
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
