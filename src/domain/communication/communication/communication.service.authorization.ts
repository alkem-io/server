import { Injectable } from '@nestjs/common';
import { ICommunication } from '@domain/communication/communication';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { DiscussionAuthorizationService } from '../discussion/discussion.service.authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { CommunicationService } from './communication.service';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { CommunityPolicyService } from '@domain/community/community-policy/community.policy.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';

@Injectable()
export class CommunicationAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private communicationService: CommunicationService,
    private communityPolicyService: CommunityPolicyService,
    private discussionAuthorizationService: DiscussionAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    communication: ICommunication,
    parentAuthorization: IAuthorizationPolicy | undefined,
    policy: ICommunityPolicy
  ): Promise<ICommunication> {
    communication.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        communication.authorization,
        parentAuthorization
      );

    communication.authorization = this.extendAuthorizationPolicy(
      communication.authorization,
      policy
    );

    communication.discussions = await this.communicationService.getDiscussions(
      communication
    );
    for (const discussion of communication.discussions) {
      await this.discussionAuthorizationService.applyAuthorizationPolicy(
        discussion,
        communication.authorization
      );
    }

    communication.updates = this.communicationService.getUpdates(communication);
    communication.updates.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        communication.updates.authorization,
        communication.authorization
      );

    return await this.communicationService.save(communication);
  }

  private extendAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined,
    policy: ICommunityPolicy
  ): IAuthorizationPolicy {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // Allow any member of this community to create discussions, and to send messages to the discussion
    const communityMember =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.READ, AuthorizationPrivilege.CREATE],
        [this.communityPolicyService.getMembershipCredential(policy)]
      );
    newRules.push(communityMember);

    //
    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
