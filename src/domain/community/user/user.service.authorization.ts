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
import { ProfileAuthorizationService } from '../profile/profile.service.authorization';
import {
  AuthorizationDefinition,
  IAuthorizationDefinition,
} from '@domain/common/authorization-definition';
import { AuthorizationCredentialRule } from '@src/services/platform/authorization-engine/authorization.credential.rule';
import { EntityNotInitializedException } from '@common/exceptions';

@Injectable()
export class UserAuthorizationService {
  constructor(
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
    profile.authorization = await this.authorizationEngine.inheritParentAuthorization(
      profile.authorization,
      user.authorization
    );
    profile.authorization = await this.authorizationEngine.appendCredentialAuthorizationRule(
      user.authorization,
      {
        type: AuthorizationCredential.GlobalAdminCommunity,
        resourceID: user.id,
      },
      [AuthorizationPrivilege.DELETE]
    );
    user.profile = await this.profileAuthorizationService.applyAuthorizationRules(
      profile
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
    const newRules: AuthorizationCredentialRule[] = [];

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

    this.authorizationEngine.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }

  createUserAuthorizationDefinition(
    userEmail: string
  ): IAuthorizationDefinition {
    const authorization = new AuthorizationDefinition();
    const newRules: AuthorizationCredentialRule[] = [];

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

    this.authorizationEngine.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }
}
