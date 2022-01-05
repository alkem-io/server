import { Injectable } from '@nestjs/common';
import { ICommunication } from '@domain/communication/communication';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { DiscussionAuthorizationService } from '../discussion/discussion.service.authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { CommunicationService } from './communication.service';
import { ICredential } from '@domain/agent';

@Injectable()
export class CommunicationAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private communicationService: CommunicationService,
    private discussionAuthorizationService: DiscussionAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    communication: ICommunication,
    parentAuthorization: IAuthorizationPolicy | undefined,
    communityCredential: ICredential
  ): Promise<ICommunication> {
    communication.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        communication.authorization,
        parentAuthorization
      );

    communication.authorization = this.extendAuthorizationPolicy(
      communication.authorization,
      communityCredential
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

    const updates = this.communicationService.getUpdates(communication);
    updates.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        updates.authorization,
        communication.authorization
      );

    return await this.communicationService.save(communication);
  }

  private extendAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined,
    communityCredential: ICredential
  ): IAuthorizationPolicy {
    const newRules: AuthorizationPolicyRuleCredential[] = [];

    // Allow any member of this community to create discussions, and to send messages to the discussion
    const communityMember = new AuthorizationPolicyRuleCredential(
      [AuthorizationPrivilege.READ, AuthorizationPrivilege.CREATE],
      communityCredential.type,
      communityCredential.resourceID
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
