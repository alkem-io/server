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
import { AuthorizationEngineService } from '@src/services/platform/authorization-engine/authorization-engine.service';
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
    private authorizationEngine: AuthorizationEngineService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private agentService: AgentService,
    private userService: UserService,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  async applyAuthorizationRules(user: IUser): Promise<IUser> {
    user.authorization = this.updateAuthorizationDefinition(
      user.authorization,
      user.id
    );

    // cascade
    const profile = this.userService.getProfile(user);
    profile.authorization = this.authorizationDefinitionService.inheritParentAuthorization(
      profile.authorization,
      user.authorization
    );

    profile.authorization = await this.authorizationDefinitionService.appendCredentialAuthorizationRule(
      profile.authorization,

      {
        type: AuthorizationCredential.GlobalAdminCommunity,
        resourceID: '',
      },
      [AuthorizationPrivilege.DELETE]
    );
    user.profile = await this.profileAuthorizationService.applyAuthorizationRules(
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

  private updateAuthorizationDefinition(
    authorization: IAuthorizationDefinition | undefined,
    userID: string
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
      ],
    };
    newRules.push(communityAdmin);

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

    this.authorizationDefinitionService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }

  createUserAuthorizationDefinition(
    userEmail: string
  ): IAuthorizationDefinition {
    const authorization = new AuthorizationDefinition();
    const newRules: AuthorizationRuleCredential[] = [];

    const globalAdmin = {
      type: AuthorizationCredential.GlobalAdmin,
      resourceID: '',
      grantedPrivileges: [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
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
      ],
    };
    newRules.push(communityAdmin);

    const userSelfCreate = {
      type: AuthorizationCredential.UserSelfManagement,
      resourceID: userEmail,
      grantedPrivileges: [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
      ],
    };
    newRules.push(userSelfCreate);

    this.authorizationDefinitionService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }
}
