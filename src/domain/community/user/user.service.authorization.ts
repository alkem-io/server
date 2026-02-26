import {
  CREDENTIAL_RULE_TYPES_USER_AUTHORIZATION_RESET,
  CREDENTIAL_RULE_TYPES_USER_GLOBAL_COMMUNITY_READ,
  CREDENTIAL_RULE_TYPES_USER_PLATFORM_ADMIN,
  CREDENTIAL_RULE_TYPES_USER_READ_GLOBAL_REGISTERED,
  CREDENTIAL_RULE_USER_READ,
  CREDENTIAL_RULE_USER_READ_PII,
  CREDENTIAL_RULE_USER_SELF_ADMIN,
  PRIVILEGE_RULE_READ_USER_SETTINGS,
} from '@common/constants';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { ActorService } from '@domain/actor/actor/actor.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { IUser } from '@domain/community/user/user.interface';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { Injectable } from '@nestjs/common';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { UserLookupService } from '../user-lookup/user.lookup.service';
import { UserSettingsAuthorizationService } from '../user-settings/user.settings.service.authorization';

@Injectable()
export class UserAuthorizationService {
  constructor(
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly profileAuthorizationService: ProfileAuthorizationService,
    private readonly platformAuthorizationService: PlatformAuthorizationPolicyService,
    private readonly storageAggregatorAuthorizationService: StorageAggregatorAuthorizationService,
    private readonly userSettingsAuthorizationService: UserSettingsAuthorizationService,
    private readonly actorService: ActorService,
    private readonly actorLookupService: ActorLookupService,
    private readonly userLookupService: UserLookupService
  ) {}

  async applyAuthorizationPolicy(
    userID: string
  ): Promise<IAuthorizationPolicy[]> {
    const user = await this.userLookupService.getUserByIdOrFail(userID, {
      relations: {
        authorization: true,
        profile: { authorization: true },
        storageAggregator: {
          authorization: true,
          directStorage: { authorization: true },
        },
        settings: {
          authorization: true,
        },
      },
    });
    if (!user.profile || !user.storageAggregator || !user.settings)
      throw new RelationshipNotFoundException(
        `Unable to load agent or profile or preferences or storage for User ${user.id} `,
        LogContext.COMMUNITY
      );

    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    // Ensure always applying from a clean state
    user.authorization = this.authorizationPolicyService.reset(
      user.authorization
    );
    user.authorization =
      this.platformAuthorizationService.inheritRootAuthorizationPolicy(
        user.authorization
      );

    user.authorization = await this.appendCredentialRules(
      user.authorization,
      user
    );

    user.authorization = this.appendPrivilegeRules(user.authorization);
    updatedAuthorizations.push(user.authorization);

    // NOTE: Clone the authorization policy to ensure the changes are local to profile
    let clonedAnonymousReadAccessAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        user.authorization
      );
    // To ensure that profile + context on a space are always publicly visible, even for private spaces
    clonedAnonymousReadAccessAuthorization =
      this.authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess(
        clonedAnonymousReadAccessAuthorization,
        AuthorizationPrivilege.READ
      );

    // cascade
    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        user.profile.id,
        clonedAnonymousReadAccessAuthorization // Key that this is publicly visible
      );
    updatedAuthorizations.push(...profileAuthorizations);

    // Note: No separate actor/agent auth inheritance needed -
    // user.authorization IS actor.authorization via getter delegation

    const settingsAuthorization =
      this.userSettingsAuthorizationService.applyAuthorizationPolicy(
        user.settings,
        user.authorization
      );
    updatedAuthorizations.push(settingsAuthorization);

    const storageAuthorizations =
      await this.storageAggregatorAuthorizationService.applyAuthorizationPolicy(
        user.storageAggregator,
        user.authorization
      );
    updatedAuthorizations.push(...storageAuthorizations);

    // Note: Conversations are now managed via the platform Messaging
    // Authorization is applied on conversations through conversation memberships

    return updatedAuthorizations;
  }

  async grantCredentialsAllUsersReceive(userID: string): Promise<IUser> {
    const user = await this.userLookupService.getUserByIdOrFail(userID);

    await this.actorService.grantCredentialOrFail(userID, {
      type: AuthorizationCredential.GLOBAL_REGISTERED,
    });
    await this.actorService.grantCredentialOrFail(userID, {
      type: AuthorizationCredential.USER_SELF_MANAGEMENT,
      resourceID: userID,
    });
    await this.actorService.grantCredentialOrFail(userID, {
      type: AuthorizationCredential.ACCOUNT_ADMIN,
      resourceID: user.accountID,
    });

    return await this.userLookupService.getUserByIdOrFail(userID);
  }

  private appendGlobalCredentialRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // Allow global admins to reset authorization
    const globalAdminNotInherited =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.AUTHORIZATION_RESET],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_TYPES_USER_AUTHORIZATION_RESET
      );
    globalAdminNotInherited.cascade = false;
    newRules.push(globalAdminNotInherited);

    // Allow global admins do platform admin actions
    const globalAdminPlatformAdminNotInherited =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.PLATFORM_ADMIN],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_TYPES_USER_PLATFORM_ADMIN
      );
    globalAdminPlatformAdminNotInherited.cascade = false;
    newRules.push(globalAdminPlatformAdminNotInherited);

    const communityAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.READ],
        [AuthorizationCredential.GLOBAL_COMMUNITY_READ],
        CREDENTIAL_RULE_TYPES_USER_GLOBAL_COMMUNITY_READ
      );
    communityAdmin.cascade = true;
    newRules.push(communityAdmin);

    const globalRegistered =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.READ],
        [AuthorizationCredential.GLOBAL_REGISTERED],
        CREDENTIAL_RULE_TYPES_USER_READ_GLOBAL_REGISTERED
      );

    newRules.push(globalRegistered);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }

  private async appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    user: IUser
  ): Promise<IAuthorizationPolicy> {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${user.id}`,
        LogContext.COMMUNITY
      );

    // add the global role rules
    this.appendGlobalCredentialRules(authorization);

    // add the rules dependent on the user
    const newRules: IAuthorizationPolicyRuleCredential[] = [];
    const userSelfManagementCredential = {
      type: AuthorizationCredential.USER_SELF_MANAGEMENT,
      resourceID: user.id,
    };

    const userSelfAdmin = this.authorizationPolicyService.createCredentialRule(
      [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ],
      [userSelfManagementCredential],
      CREDENTIAL_RULE_USER_SELF_ADMIN
    );
    newRules.push(userSelfAdmin);

    const communityReader =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.READ_USER_SETTINGS,
        ],
        [
          AuthorizationCredential.GLOBAL_COMMUNITY_READ,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_USER_READ
      );
    communityReader.cascade = true;
    newRules.push(communityReader);

    // Determine who is able to see the PII designated fields for a User
    const credentials = await this.actorLookupService.getActorCredentialsOrFail(
      user.id
    );
    const readUserPiiCredentials: ICredentialDefinition[] = [
      userSelfManagementCredential,
    ];

    // Ensure global admins can see PII
    readUserPiiCredentials.push({
      type: AuthorizationCredential.GLOBAL_ADMIN,
      resourceID: '',
    });
    readUserPiiCredentials.push({
      type: AuthorizationCredential.GLOBAL_SUPPORT,
      resourceID: '',
    });
    readUserPiiCredentials.push({
      type: AuthorizationCredential.GLOBAL_COMMUNITY_READ,
      resourceID: '',
    });

    // Give visibility to admins of communities / orgs
    for (const credential of credentials) {
      // Grant read access to Space Admins for spaces the user is a member of
      if (credential.type === AuthorizationCredential.SPACE_MEMBER) {
        readUserPiiCredentials.push({
          type: AuthorizationCredential.SPACE_ADMIN,
          resourceID: credential.resourceID,
        });
      } else if (
        credential.type === AuthorizationCredential.ORGANIZATION_ASSOCIATE
      ) {
        readUserPiiCredentials.push({
          type: AuthorizationCredential.ORGANIZATION_ADMIN,
          resourceID: credential.resourceID,
        });
      }
    }

    if (readUserPiiCredentials.length > 0) {
      const readRule = this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.READ_USER_PII],
        readUserPiiCredentials,
        CREDENTIAL_RULE_USER_READ_PII
      );
      newRules.push(readRule);
    }

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    const readSettingsPrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.READ_USER_SETTINGS],
      AuthorizationPrivilege.UPDATE,
      PRIVILEGE_RULE_READ_USER_SETTINGS
    );
    privilegeRules.push(readSettingsPrivilege);

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }
}
