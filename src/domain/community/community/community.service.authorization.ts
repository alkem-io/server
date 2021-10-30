import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommunityService } from './community.service';
import { Community, ICommunity } from '@domain/community/community';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { UserGroupAuthorizationService } from '../user-group/user-group.service.authorization';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { CommunicationAuthorizationService } from '@domain/communication/communication/communication.service.authorization';

@Injectable()
export class CommunityAuthorizationService {
  constructor(
    private communityService: CommunityService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private userGroupAuthorizationService: UserGroupAuthorizationService,
    private communicationAuthorizationService: CommunicationAuthorizationService,
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

    community.authorization = this.extendAuthorizationPolicy(
      community.authorization,
      parentAuthorization?.anonymousReadAccess
    );

    // always false
    community.authorization.anonymousReadAccess = false;

    // cascade to communication child entity
    community.communication = await this.communityService.getCommunication(
      community.id
    );
    if (community.communication) {
      await this.communicationAuthorizationService.applyAuthorizationPolicy(
        community.communication,
        community.authorization,
        this.communityService.getMembershipCredential(community)
      );
    }

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

  private extendAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined,
    allowGlobalRegisteredReadAccess: boolean | undefined
  ): IAuthorizationPolicy {
    const newRules: AuthorizationPolicyRuleCredential[] = [];

    const globalCommunityAdmin = {
      type: AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY,
      resourceID: '',
      grantedPrivileges: [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.GRANT,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ],
    };
    newRules.push(globalCommunityAdmin);

    if (allowGlobalRegisteredReadAccess) {
      const globalRegistered = {
        type: AuthorizationCredential.GLOBAL_REGISTERED,
        resourceID: '',
        grantedPrivileges: [AuthorizationPrivilege.READ],
      };
      newRules.push(globalRegistered);
    }

    //
    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
