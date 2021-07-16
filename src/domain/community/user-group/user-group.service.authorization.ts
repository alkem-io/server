import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { AuthorizationEngineService } from '@src/services/platform/authorization-engine/authorization-engine.service';
import { ProfileAuthorizationService } from '@domain/community/profile/profile.service.authorization';
import { IAuthorizationDefinition } from '@domain/common/authorization-definition';
import { EntityNotInitializedException } from '@common/exceptions';
import { IUserGroup, UserGroup } from '@domain/community/user-group';
import { UserGroupService } from './user-group.service';
import { AuthorizationDefinitionService } from '@domain/common/authorization-definition/authorization.definition.service';
import { AuthorizationRuleCredential } from '@domain/common/authorization-definition/authorization.rule.credential';

@Injectable()
export class UserGroupAuthorizationService {
  constructor(
    private authorizationDefinition: AuthorizationDefinitionService,
    private authorizationEngine: AuthorizationEngineService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private userGroupService: UserGroupService,
    @InjectRepository(UserGroup)
    private userGroupRepository: Repository<UserGroup>
  ) {}

  async applyAuthorizationPolicy(userGroup: IUserGroup): Promise<IUserGroup> {
    userGroup.authorization = this.updateAuthorizationPolicy(
      userGroup.authorization,
      userGroup.id
    );

    // cascade
    const profile = this.userGroupService.getProfile(userGroup);
    profile.authorization = await this.authorizationDefinition.inheritParentAuthorization(
      profile.authorization,
      userGroup.authorization
    );
    userGroup.profile = await this.profileAuthorizationService.applyAuthorizationPolicy(
      profile
    );

    return await this.userGroupRepository.save(userGroup);
  }

  private updateAuthorizationPolicy(
    authorization: IAuthorizationDefinition | undefined,
    userGroupID: string
  ): IAuthorizationDefinition {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${userGroupID}`,
        LogContext.COMMUNITY
      );
    const newRules: AuthorizationRuleCredential[] = [];

    const userGroupMember = {
      type: AuthorizationCredential.UserGroupMember,
      resourceID: userGroupID,
      grantedPrivileges: [AuthorizationPrivilege.READ],
    };
    newRules.push(userGroupMember);

    this.authorizationDefinition.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }
}
