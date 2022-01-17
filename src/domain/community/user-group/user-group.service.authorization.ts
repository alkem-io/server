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
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';

@Injectable()
export class UserGroupAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private userGroupService: UserGroupService,
    @InjectRepository(UserGroup)
    private userGroupRepository: Repository<UserGroup>
  ) {}

  async applyAuthorizationPolicy(
    userGroup: IUserGroup,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IUserGroup> {
    userGroup.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        userGroup.authorization,
        parentAuthorization
      );
    userGroup.authorization = this.extendCredentialRules(
      userGroup.authorization,
      userGroup.id
    );

    // cascade
    userGroup.profile = this.userGroupService.getProfile(userGroup);
    userGroup.profile.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        userGroup.profile.authorization,
        userGroup.authorization
      );
    userGroup.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        userGroup.profile
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
    const newRules: AuthorizationPolicyRuleCredential[] = [];

    const userGroupMember = new AuthorizationPolicyRuleCredential(
      [AuthorizationPrivilege.READ],
      AuthorizationCredential.USER_GROUP_MEMBER,
      userGroupID
    );

    newRules.push(userGroupMember);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }
}
