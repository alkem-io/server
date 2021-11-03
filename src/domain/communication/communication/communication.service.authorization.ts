import { Injectable } from '@nestjs/common';
import { ICommunication } from '@domain/communication/communication';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { DiscussionAuthorizationService } from '../discussion/discussion.service.authorization';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
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
      communication.authorization
    );

    for (const discussion of this.communicationService.getDiscussions(
      communication
    )) {
      await this.discussionAuthorizationService.applyAuthorizationPolicy(
        discussion,
        communication.authorization,
        communityCredential
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
    authorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    const newRules: AuthorizationPolicyRuleCredential[] = [];

    // Allow any registered users to create discussions
    const globalRegistered = {
      type: AuthorizationCredential.GLOBAL_REGISTERED,
      resourceID: '',
      grantedPrivileges: [AuthorizationPrivilege.CREATE],
    };
    newRules.push(globalRegistered);

    //
    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
