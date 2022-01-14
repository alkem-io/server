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
import { ApplicationAuthorizationService } from '../application/application.service.authorization';

@Injectable()
export class CommunityAuthorizationService {
  constructor(
    private communityService: CommunityService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private userGroupAuthorizationService: UserGroupAuthorizationService,
    private communicationAuthorizationService: CommunicationAuthorizationService,
    private applicationAuthorizationService: ApplicationAuthorizationService,
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
    await this.communicationAuthorizationService.applyAuthorizationPolicy(
      community.communication,
      community.authorization,
      this.communityService.getMembershipCredential(community)
    );

    // cascade
    const groups = await this.communityService.getUserGroups(community);
    for (const group of groups) {
      const savedGroup =
        await this.userGroupAuthorizationService.applyAuthorizationPolicy(
          group,
          community.authorization
        );
      group.authorization = savedGroup.authorization;
    }

    const applications = await this.communityService.getApplications(community);
    for (const application of applications) {
      const applicationSaved =
        await this.applicationAuthorizationService.applyAuthorizationPolicy(
          application,
          community.authorization
        );
      application.authorization = applicationSaved.authorization;
    }

    return await this.communityRepository.save(community);
  }

  private extendAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined,
    allowGlobalRegisteredReadAccess: boolean | undefined
  ): IAuthorizationPolicy {
    const newRules: AuthorizationPolicyRuleCredential[] = [];

    const globalCommunityAdmin = new AuthorizationPolicyRuleCredential(
      [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.GRANT,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ],
      AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY
    );
    newRules.push(globalCommunityAdmin);

    if (allowGlobalRegisteredReadAccess) {
      const globalRegistered = new AuthorizationPolicyRuleCredential(
        [AuthorizationPrivilege.READ],
        AuthorizationCredential.GLOBAL_REGISTERED
      );
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
