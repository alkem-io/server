import { Injectable } from '@nestjs/common';
import { ICommunication } from '@domain/communication/communication';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { DiscussionAuthorizationService } from '../discussion/discussion.service.authorization';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { CommunicationService } from './communication.service';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import {
  POLICY_RULE_COMMUNICATION_CONTRIBUTE,
  POLICY_RULE_COMMUNICATION_CREATE,
} from '@common/constants';
import { RoomAuthorizationService } from '../room/room.service.authorization';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';

@Injectable()
export class CommunicationAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private communicationService: CommunicationService,
    private discussionAuthorizationService: DiscussionAuthorizationService,
    private roomAuthorizationService: RoomAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    communicationInput: ICommunication,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ICommunication> {
    const communication =
      await this.communicationService.getCommunicationOrFail(
        communicationInput.id,
        {
          relations: {
            discussions: {
              comments: true,
            },
            updates: {
              authorization: true,
            },
          },
        }
      );

    if (!communication.discussions || !communication.updates) {
      throw new RelationshipNotFoundException(
        `Unable to load entities to reset auth for communication ${communication.id} `,
        LogContext.COMMUNICATION
      );
    }

    communication.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        communication.authorization,
        parentAuthorization
      );

    communication.authorization = this.appendPrivilegeRules(
      communication.authorization
    );

    for (const discussion of communication.discussions) {
      await this.discussionAuthorizationService.applyAuthorizationPolicy(
        discussion,
        communication.authorization
      );
    }

    communication.updates =
      this.roomAuthorizationService.applyAuthorizationPolicy(
        communication.updates,
        communication.authorization
      );
    // Note: do NOT allow contributors to create new messages for updates...
    communication.updates.authorization =
      this.roomAuthorizationService.allowContributorsToReplyReactToMessages(
        communication.updates.authorization
      );

    return communication;
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
}
