import { Injectable } from '@nestjs/common';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { IUser } from '@domain/community/user';
import { AgentService } from '@domain/agent/agent/agent.service';
import { UserService } from './user.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { PreferenceSetAuthorizationService } from '@domain/common/preference-set/preference.set.service.authorization';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import {
  CREDENTIAL_RULE_TYPES_USER_AUTHORIZATION_RESET,
  CREDENTIAL_RULE_TYPES_USER_GLOBAL_ADMIN_COMMUNITY,
  CREDENTIAL_RULE_USER_SELF_ADMIN,
  CREDENTIAL_RULE_USER_READ_PII,
} from '@common/constants';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';

@Injectable()
export class UserAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private preferenceSetAuthorizationService: PreferenceSetAuthorizationService,
    private storageAggregatorAuthorizationService: StorageAggregatorAuthorizationService,
    private agentService: AgentService,
    private userService: UserService
  ) {}

  async applyAuthorizationPolicy(userInput: IUser): Promise<IUser> {
    const user = await this.userService.getUserOrFail(userInput.id, {
      relations: {
        agent: true,
        profile: true,
        preferenceSet: true,
        storageAggregator: true,
      },
    });
    if (
      !user.agent ||
      !user.profile ||
      !user.preferenceSet ||
      !user.storageAggregator
    )
      throw new RelationshipNotFoundException(
        `Unable to load agent or profile or preferences or storage for User ${user.id} `,
        LogContext.COMMUNITY
      );
    // NOTE: Clone the authorization policy to ensure the changes are local to profile
    const clonedAnonymousReadAccessAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        user.authorization
      );
    // To ensure that profile + context on a space are always publicly visible, even for private spaces
    clonedAnonymousReadAccessAuthorization.anonymousReadAccess = true;

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

    // cascade
    user.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        user.profile,
        clonedAnonymousReadAccessAuthorization // Key that this is publicly visible
      );

    user.agent.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        user.agent.authorization,
        user.authorization
      );

    user.preferenceSet =
      await this.preferenceSetAuthorizationService.applyAuthorizationPolicy(
        user.preferenceSet,
        user.authorization
      );

    user.storageAggregator =
      await this.storageAggregatorAuthorizationService.applyAuthorizationPolicy(
        user.storageAggregator,
        user.authorization
      );

    return await this.userService.saveUser(user);
  }

  async grantCredentials(user: IUser): Promise<IUser> {
    const agent = await this.userService.getAgent(user.id);

    user.agent = await this.agentService.grantCredential({
      type: AuthorizationCredential.GLOBAL_REGISTERED,
      agentID: agent.id,
    });
    user.agent = await this.agentService.grantCredential({
      type: AuthorizationCredential.USER_SELF_MANAGEMENT,
      agentID: agent.id,
      resourceID: user.id,
    });
    return await this.userService.saveUser(user);
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
          AuthorizationCredential.GLOBAL_ADMIN_SPACES,
        ],
        CREDENTIAL_RULE_TYPES_USER_AUTHORIZATION_RESET
      );
    globalAdminNotInherited.cascade = false;
    newRules.push(globalAdminNotInherited);

    const communityAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        [AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY],
        CREDENTIAL_RULE_TYPES_USER_GLOBAL_ADMIN_COMMUNITY
      );

    newRules.push(communityAdmin);

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

    // Determine who is able to see the PII designated fields for a User
    const { credentials } = await this.userService.getUserAndCredentials(
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
      type: AuthorizationCredential.GLOBAL_ADMIN_SPACES,
      resourceID: '',
    });
    readUserPiiCredentials.push({
      type: AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY,
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
      } else if (credential.type === AuthorizationCredential.CHALLENGE_MEMBER) {
        readUserPiiCredentials.push({
          type: AuthorizationCredential.CHALLENGE_ADMIN,
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
}
