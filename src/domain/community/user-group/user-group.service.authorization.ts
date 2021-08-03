import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { ProfileAuthorizationService } from '@domain/community/profile/profile.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { EntityNotInitializedException } from '@common/exceptions';
import { IUserGroup, UserGroup } from '@domain/community/user-group';
import { UserGroupService } from './user-group.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationRuleCredential } from '@domain/common/authorization-policy/authorization.rule.credential';

@Injectable()
export class UserGroupAuthorizationService {
  constructor(
    private authorizationDefinition: AuthorizationPolicyService,
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
    savedGroup.profile.authorization =
      await this.authorizationDefinition.inheritParentAuthorization(
        savedGroup.profile.authorization,
        userGroup.authorization
      );
    userGroup.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        savedGroup.profile
      );

    return await this.userGroupRepository.save(userGroup);
  }

  private extendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    userGroupID: string
  ): IAuthorizationPolicy {
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
