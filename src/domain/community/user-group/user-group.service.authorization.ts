import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
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
    private profileAuthorizationService: ProfileAuthorizationService,
    private userGroupService: UserGroupService,
    @InjectRepository(UserGroup)
    private userGroupRepository: Repository<UserGroup>
  ) {}

  async applyAuthorizationPolicy(userGroup: IUserGroup): Promise<IUserGroup> {
    userGroup.authorization = this.extendCredentialRules(
      userGroup.authorization,
      userGroup.id
    );
    const savedGroup: IUserGroup = await this.userGroupRepository.save(
      userGroup
    );

    // cascade
    savedGroup.profile = this.userGroupService.getProfile(userGroup);
    savedGroup.profile.authorization = await this.authorizationDefinition.inheritParentAuthorization(
      savedGroup.profile.authorization,
      userGroup.authorization
    );
    userGroup.profile = await this.profileAuthorizationService.applyAuthorizationPolicy(
      savedGroup.profile
    );

    return await this.userGroupRepository.save(userGroup);
  }

  private extendCredentialRules(
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
