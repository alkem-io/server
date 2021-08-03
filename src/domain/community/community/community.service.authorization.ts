import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommunityService } from './community.service';
import { Community, ICommunity } from '@domain/community/community';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { UserGroupAuthorizationService } from '../user-group/user-group.service.authorization';

@Injectable()
export class CommunityAuthorizationService {
  constructor(
    private communityService: CommunityService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private userGroupAuthorizationService: UserGroupAuthorizationService,
    @InjectRepository(Community)
    private communityRepository: Repository<Community>
  ) {}

  async applyAuthorizationPolicy(
    community: ICommunity,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ICommunity> {
    community.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        community.authorization,
        parentAuthorization
      );
    // always false
    community.authorization.anonymousReadAccess = false;

    community.authorization = this.extendAuthorizationDefinition(
      community.authorization
    );

    // cascade
    const groups = await this.communityService.getUserGroups(community);
    for (const group of groups) {
      group.authorization =
        await this.authorizationPolicyService.inheritParentAuthorization(
          group.authorization,
          community.authorization
        );
      await this.userGroupAuthorizationService.applyAuthorizationPolicy(group);
    }

    const applications = await this.communityService.getApplications(community);
    for (const application of applications) {
      application.authorization =
        await this.authorizationPolicyService.inheritParentAuthorization(
          application.authorization,
          community.authorization
        );
    }

    return await this.communityRepository.save(community);
  }

  private extendAuthorizationDefinition(
    authorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    return this.authorizationPolicyService.appendCredentialAuthorizationRule(
      authorization,
      {
        type: AuthorizationCredential.GlobalAdminCommunity,
        resourceID: '',
      },
      [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
        AuthorizationPrivilege.GRANT,
      ]
    );
  }
}
