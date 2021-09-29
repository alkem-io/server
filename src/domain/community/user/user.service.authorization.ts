import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { User, IUser } from '@domain/community/user';
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
    private userService: UserService,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  async applyAuthorizationPolicy(user: IUser): Promise<IUser> {
    // Ensure always applying from a clean state
    user.authorization = await this.authorizationPolicyService.reset(
      user.authorization
    );

    user.authorization = await this.appendCredentialRules(
      user.authorization,
      user
    );

    // cascade
    const profile = this.userService.getProfile(user);
    profile.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        profile.authorization,
        user.authorization
      );

    // Allow users to also delete entities within the profile
    profile.authorization =
      await this.authorizationPolicyService.appendCredentialAuthorizationRule(
        profile.authorization,
        {
          type: AuthorizationCredential.USER_SELF_MANAGEMENT,
          resourceID: user.id,
        },
        [AuthorizationPrivilege.DELETE]
      );
    user.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(profile);
    user.agent = await this.userService.getAgent(user.id);
    user.agent.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        user.agent.authorization,
        user.authorization
      );

    return await this.userRepository.save(user);
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
    return await this.userRepository.save(user);
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

    const globalAdmin = {
      type: AuthorizationCredential.GLOBAL_ADMIN,
      resourceID: '',
      grantedPrivileges: [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
        AuthorizationPrivilege.GRANT,
      ],
    };
    newRules.push(globalAdmin);

    const communityAdmin = {
      type: AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY,
      resourceID: '',
      grantedPrivileges: [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
        AuthorizationPrivilege.GRANT,
      ],
    };
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

    const userSelfAdmin = {
      type: AuthorizationCredential.USER_SELF_MANAGEMENT,
      resourceID: user.id,
      grantedPrivileges: [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
      ],
    };
    newRules.push(userSelfAdmin);

    // Get the agent + credentials + grant access for ecoverse / challenge admins read only
    const { credentials } = await this.userService.getUserAndCredentials(
      user.id
    );
    for (const credential of credentials) {
      // Grant read access to Ecoverse Admins for ecoverses the user is a member of
      if (credential.type === AuthorizationCredential.ECOVERSE_MEMBER) {
        const ecoverseAdmin = {
          type: AuthorizationCredential.ECOVERSE_ADMIN,
          resourceID: credential.resourceID,
          grantedPrivileges: [AuthorizationPrivilege.READ],
        };
        newRules.push(ecoverseAdmin);
      } else if (credential.type === AuthorizationCredential.CHALLENGE_MEMBER) {
        const challengeAdmin = {
          type: AuthorizationCredential.CHALLENGE_ADMIN,
          resourceID: credential.resourceID,
          grantedPrivileges: [AuthorizationPrivilege.READ],
        };
        newRules.push(challengeAdmin);
      } else if (
        credential.type === AuthorizationCredential.ORGANIZATION_MEMBER
      ) {
        const challengeAdmin = {
          type: AuthorizationCredential.ORGANIZATION_ADMIN,
          resourceID: credential.resourceID,
          grantedPrivileges: [AuthorizationPrivilege.READ],
        };
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
