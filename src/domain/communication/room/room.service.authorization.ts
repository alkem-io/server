import { Injectable } from '@nestjs/common';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { RoomService } from './room.service';
import { IRoom } from './room.interface';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_ROOM_MESSAGE_SENDER,
  CREDENTIAL_RULE_ROOM_REACTION_SENDER,
  POLICY_RULE_ROOM_ADMINS,
  POLICY_RULE_ROOM_CONTRIBUTE,
} from '@common/constants';

@Injectable()
export class RoomAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private roomService: RoomService
  ) {}

  applyAuthorizationPolicy(
    room: IRoom,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    let updatedAuthorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        room.authorization,
        parentAuthorization
      );

    updatedAuthorization = this.allowAdminsToComment(updatedAuthorization);

    return updatedAuthorization;
  }

  public allowContributorsToCreateMessages(
    authorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    // Allow any contributor to this community to create discussions, and to send messages to the discussion
    const contributePrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.CREATE_MESSAGE],
      AuthorizationPrivilege.CONTRIBUTE,
      POLICY_RULE_ROOM_CONTRIBUTE
    );
    privilegeRules.push(contributePrivilege);

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }

  public allowContributorsToReplyReactToMessages(
    authorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    // Allow any contributor to this community to create discussions, and to send messages to the discussion
    const contributePrivilege = new AuthorizationPolicyRulePrivilege(
      [
        AuthorizationPrivilege.CREATE_MESSAGE_REPLY,
        AuthorizationPrivilege.CREATE_MESSAGE_REACTION,
      ],
      AuthorizationPrivilege.CONTRIBUTE,
      POLICY_RULE_ROOM_CONTRIBUTE
    );
    privilegeRules.push(contributePrivilege);

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }

  public allowAdminsToComment(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    const createPrivilege = new AuthorizationPolicyRulePrivilege(
      [
        AuthorizationPrivilege.CREATE_MESSAGE,
        AuthorizationPrivilege.CREATE_MESSAGE_REPLY,
        AuthorizationPrivilege.CREATE_MESSAGE_REACTION,
      ],
      AuthorizationPrivilege.CREATE,
      POLICY_RULE_ROOM_ADMINS
    );
    privilegeRules.push(createPrivilege);

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }

  async extendAuthorizationPolicyForMessageSender(
    room: IRoom,
    messageID: string
  ): Promise<IAuthorizationPolicy> {
    return this.extendAuthorizationPolicyForSender(
      room,
      () => this.roomService.getUserIdForMessage(room, messageID),
      CREDENTIAL_RULE_ROOM_MESSAGE_SENDER
    );
  }

  async extendAuthorizationPolicyForReactionSender(
    room: IRoom,
    reactionID: string
  ): Promise<IAuthorizationPolicy> {
    return this.extendAuthorizationPolicyForSender(
      room,
      () => this.roomService.getUserIdForReaction(room, reactionID),
      CREDENTIAL_RULE_ROOM_REACTION_SENDER
    );
  }

  /**
   * Generic method to extend authorization policy for a sender.
   * Used by extendAuthorizationPolicyForMessageSender and extendAuthorizationPolicyForReactionSender.
   */
  private async extendAuthorizationPolicyForSender(
    room: IRoom,
    getSenderUserId: () => Promise<string>,
    credentialRuleLabel: string
  ): Promise<IAuthorizationPolicy> {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const senderUserID = await getSenderUserId();

    if (senderUserID !== '') {
      const senderRule = this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.UPDATE, AuthorizationPrivilege.DELETE],
        [
          {
            type: AuthorizationCredential.USER_SELF_MANAGEMENT,
            resourceID: senderUserID,
          },
        ],
        credentialRuleLabel
      );
      newRules.push(senderRule);
    }

    const clonedRoomAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        room.authorization
      );

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      clonedRoomAuthorization,
      newRules
    );
  }
}
