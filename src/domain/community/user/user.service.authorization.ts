import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { User, IUser } from '@domain/community/user';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AuthorizationRule } from '@src/services/authorization-engine/authorizationRule';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { UserService } from './user.service';
import { ProfileAuthorizationService } from '../profile/profile.service.authorization';

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
    user.authorizationRules = this.createAuthorizationRules(user.id);

    // cascade
    const profile = this.userService.getProfile(user);
    profile.authorizationRules = await this.authorizationEngine.appendAuthorizationRule(
      user.authorizationRules,
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
    const agent = await this.userService.getAgent(user);

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

  private createAuthorizationRules(userID: string): string {
    const rules: AuthorizationRule[] = [];

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
    rules.push(globalAdmin);

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
    rules.push(communityAdmin);

    const userSelfAdmin = {
      type: AuthorizationCredential.UserSelfManagement,
      resourceID: userID,
      grantedPrivileges: [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
      ],
    };
    rules.push(userSelfAdmin);

    return JSON.stringify(rules);
  }
}
