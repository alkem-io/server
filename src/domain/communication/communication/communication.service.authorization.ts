import { Injectable } from '@nestjs/common';
import { ICommunication } from '@domain/communication/communication';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { DiscussionAuthorizationService } from '../discussion/discussion.service.authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { CommunicationService } from './communication.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import {
  POLICY_RULE_COMMUNICATION_CONTRIBUTE,
  POLICY_RULE_COMMUNICATION_CREATE,
} from '@common/constants';

@Injectable()
export class CommunicationAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private communicationService: CommunicationService,
    private discussionAuthorizationService: DiscussionAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    communication: ICommunication,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ICommunication> {
    communication.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        communication.authorization,
        parentAuthorization
      );

    communication.authorization = this.appendPrivilegeRules(
      communication.authorization
    );

    communication.authorization = this.extendAuthorizationPolicy(
      communication.authorization
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

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    // Allow any contributor to this community to create discussions, and to send messages to the discussion
    const contributePrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.CREATE_DISCUSSION],
      AuthorizationPrivilege.CONTRIBUTE,
      POLICY_RULE_COMMUNICATION_CONTRIBUTE
    );
    privilegeRules.push(contributePrivilege);

    const createPrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.CREATE_DISCUSSION],
      AuthorizationPrivilege.CREATE,
      POLICY_RULE_COMMUNICATION_CREATE
    );
    privilegeRules.push(createPrivilege);
    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }

  private extendAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    //
    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
