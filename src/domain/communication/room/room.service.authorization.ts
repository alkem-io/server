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

  async applyAuthorizationPolicy(
    room: IRoom,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IRoom> {
    room.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        room.authorization,
        parentAuthorization
      );

    room.authorization = this.allowAdminsToComment(room.authorization);

    return await this.roomService.save(room);
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
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const senderUserID = await this.roomService.getUserIdForMessage(
      room,
      messageID
    );

    if (senderUserID !== '') {
      const messageSender =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.UPDATE, AuthorizationPrivilege.DELETE],
          [
            {
              type: AuthorizationCredential.USER_SELF_MANAGEMENT,
              resourceID: senderUserID,
            },
          ],
          CREDENTIAL_RULE_ROOM_MESSAGE_SENDER
        );
      newRules.push(messageSender);
    }

    const clonedRoomAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        room.authorization
      );

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        clonedRoomAuthorization,
        newRules
      );

    return updatedAuthorization;
  }

  async extendAuthorizationPolicyForReactionSender(
    room: IRoom,
    reactionID: string
  ): Promise<IAuthorizationPolicy> {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const senderUserID = await this.roomService.getUserIdForReaction(
      room,
      reactionID
    );

    if (senderUserID !== '') {
      const reactionSenderRule =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.UPDATE, AuthorizationPrivilege.DELETE],
          [
            {
              type: AuthorizationCredential.USER_SELF_MANAGEMENT,
              resourceID: senderUserID,
            },
          ],
          CREDENTIAL_RULE_ROOM_REACTION_SENDER
        );
      newRules.push(reactionSenderRule);
    }

    const clonedRoomAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        room.authorization
      );

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        clonedRoomAuthorization,
        newRules
      );

    return updatedAuthorization;
  }
}
