import { Injectable } from '@nestjs/common';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { IUser } from '@domain/community/user';
import { AgentService } from '@domain/agent/agent/agent.service';
import { UserService } from './user.service';
import { ProfileAuthorizationService } from '@domain/community/profile/profile.service.authorization';
import {
  AuthorizationPolicy,
  IAuthorizationPolicy,
} from '@domain/common/authorization-policy';
import { EntityNotInitializedException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';

@Injectable()
export class UserAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private agentService: AgentService,
    private userService: UserService
  ) {}

  async applyAuthorizationPolicy(user: IUser): Promise<IUser> {
    // Ensure always applying from a clean state
    user.authorization = this.authorizationPolicyService.reset(
      user.authorization
    );
    user.authorization =
      this.authorizationPolicyService.inheritPlatformAuthorization(
        user.authorization
      );

    user.authorization = await this.appendCredentialRules(
      user.authorization,
      user
    );

    // cascade
    user.profile = await this.userService.getProfile(user);
    user.profile.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        user.profile.authorization,
        user.authorization
      );

    // Allow users to also delete entities within the profile
    user.profile.authorization =
      await this.authorizationPolicyService.appendCredentialAuthorizationRule(
        user.profile.authorization,
        {
          type: AuthorizationCredential.USER_SELF_MANAGEMENT,
          resourceID: user.id,
        },
        [AuthorizationPrivilege.DELETE]
      );
    user.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        user.profile
      );
    user.agent = await this.userService.getAgent(user.id);
    user.agent.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        user.agent.authorization,
        user.authorization
      );

    const preferences = await this.userService.getPreferences(user.id);

    if (preferences) {
      for (const preference of preferences) {
        preference.authorization =
          this.authorizationPolicyService.inheritParentAuthorization(
            preference.authorization,
            user.authorization
          );
      }
      user.preferences = preferences;
    }

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

  // Create an instance for usage in a mutation
  public createUserAuthorizationPolicy(): IAuthorizationPolicy {
    const authorization = new AuthorizationPolicy();
    return this.appendGlobalCredentialRules(authorization);
  }

  private appendGlobalCredentialRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    const newRules: AuthorizationPolicyRuleCredential[] = [];

    const communityAdmin = new AuthorizationPolicyRuleCredential(
      [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
        AuthorizationPrivilege.GRANT,
      ],
      AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY
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
    const newRules: AuthorizationPolicyRuleCredential[] = [];

    const userSelfAdmin = new AuthorizationPolicyRuleCredential(
      [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
      ],
      AuthorizationCredential.USER_SELF_MANAGEMENT,
      user.id
    );
    newRules.push(userSelfAdmin);

    // Get the agent + credentials + grant access for ecoverse / challenge admins read only
    const { credentials } = await this.userService.getUserAndCredentials(
      user.id
    );
    for (const credential of credentials) {
      // Grant read access to Ecoverse Admins for ecoverses the user is a member of
      if (credential.type === AuthorizationCredential.ECOVERSE_MEMBER) {
        const ecoverseAdmin = new AuthorizationPolicyRuleCredential(
          [AuthorizationPrivilege.READ],
          AuthorizationCredential.ECOVERSE_ADMIN,
          credential.resourceID
        );
        newRules.push(ecoverseAdmin);
      } else if (credential.type === AuthorizationCredential.CHALLENGE_MEMBER) {
        const challengeAdmin = new AuthorizationPolicyRuleCredential(
          [AuthorizationPrivilege.READ],
          AuthorizationCredential.CHALLENGE_ADMIN,
          credential.resourceID
        );

        newRules.push(challengeAdmin);
      } else if (
        credential.type === AuthorizationCredential.ORGANIZATION_MEMBER
      ) {
        const challengeAdmin = new AuthorizationPolicyRuleCredential(
          [AuthorizationPrivilege.READ],
          AuthorizationCredential.ORGANIZATION_ADMIN,
          credential.resourceID
        );

        newRules.push(challengeAdmin);
      }
    }

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }
}
