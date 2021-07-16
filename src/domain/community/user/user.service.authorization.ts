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
  AuthorizationDefinition,
  AuthorizationRuleCredential,
  IAuthorizationDefinition,
} from '@domain/common/authorization-definition';
import { EntityNotInitializedException } from '@common/exceptions';
import { AuthorizationDefinitionService } from '@domain/common/authorization-definition/authorization.definition.service';

@Injectable()
export class UserAuthorizationService {
  constructor(
    private authorizationDefinitionService: AuthorizationDefinitionService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private agentService: AgentService,
    private userService: UserService,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  async applyAuthorizationPolicy(user: IUser): Promise<IUser> {
    // Ensure always applying from a clean state
    user.authorization = await this.authorizationDefinitionService.reset(
      user.authorization
    );

    user.authorization = this.appendCredentialRules(
      user.authorization,
      user.id
    );

    // cascade
    const profile = this.userService.getProfile(user);
    profile.authorization = this.authorizationDefinitionService.inheritParentAuthorization(
      profile.authorization,
      user.authorization
    );

    // Allow users to also delete entities within the profile
    profile.authorization = await this.authorizationDefinitionService.appendCredentialAuthorizationRule(
      profile.authorization,
      {
        type: AuthorizationCredential.UserSelfManagement,
        resourceID: user.id,
      },
      [AuthorizationPrivilege.DELETE]
    );
    user.profile = await this.profileAuthorizationService.applyAuthorizationPolicy(
      profile
    );
    user.agent = await this.userService.getAgent(user.id);
    user.agent.authorization = this.authorizationDefinitionService.inheritParentAuthorization(
      user.agent.authorization,
      user.authorization
    );

    return await this.userRepository.save(user);
  }

  async grantCredentials(user: IUser): Promise<IUser> {
    const agent = await this.userService.getAgent(user.id);

    user.agent = await this.agentService.grantCredential({
      type: AuthorizationCredential.GlobalRegistered,
      agentID: agent.id,
    });
    user.agent = await this.agentService.grantCredential({
      type: AuthorizationCredential.UserSelfManagement,
      agentID: agent.id,
      resourceID: user.id,
    });
    return await this.userRepository.save(user);
  }

  // Create an instance for usage in a mutation
  public createUserAuthorizationDefinition(): IAuthorizationDefinition {
    const authorization = new AuthorizationDefinition();
    return this.appendCredentialRules(authorization);
  }

  private appendCredentialRules(
    authorization: IAuthorizationDefinition | undefined,
    userID?: string
  ): IAuthorizationDefinition {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${userID}`,
        LogContext.COMMUNITY
      );
    const newRules: AuthorizationRuleCredential[] = [];

    const globalAdmin = {
      type: AuthorizationCredential.GlobalAdmin,
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
      type: AuthorizationCredential.GlobalAdminCommunity,
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

    if (userID) {
      const userSelfAdmin = {
        type: AuthorizationCredential.UserSelfManagement,
        resourceID: userID,
        grantedPrivileges: [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
        ],
      };
      newRules.push(userSelfAdmin);
    }

    this.authorizationDefinitionService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }
}
