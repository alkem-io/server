import { Injectable } from '@nestjs/common';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ConversationService } from './conversation.service';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { EntityNotInitializedException } from '@common/exceptions';
import { RoomAuthorizationService } from '@domain/communication/room/room.service.authorization';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';

@Injectable()
export class ConversationAuthorizationService {
  constructor(
    private conversationService: ConversationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private roomAuthorizationService: RoomAuthorizationService
  ) {}

  public async applyAuthorizationPolicy(
    conversationID: string,
    conversationHostID: string,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const conversation = await this.conversationService.getConversationOrFail(
      conversationID,
      {
        relations: {
          authorization: true,
          room: true,
        },
      }
    );

    if (!conversation.authorization) {
      throw new EntityNotInitializedException(
        `authorization: Unable to load conversation entities for auth reset: ${conversation.id}`,
        LogContext.COLLABORATION
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    conversation.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        conversation.authorization,
        parentAuthorization
      );

    // Allow the host user to contribute to the conversation
    conversation.authorization.credentialRules.push(
      this.createCredentialRuleContributors([conversationHostID])
    );

    // Add in logic to allow the users to send messages in the conversation
    if (conversation.type === CommunicationConversationType.USER_USER) {
      if (!conversation.userID) {
        throw new EntityNotInitializedException(
          `conversation: Missing userID for USER_USER conversation: ${conversation.id}`,
          LogContext.COMMUNICATION
        );
      }
      conversation.authorization.credentialRules.push(
        this.createCredentialRuleContributors([conversation.userID])
      );
    }

    updatedAuthorizations.push(conversation.authorization);

    // Cascade to the room, if it exists
    if (conversation.room) {
      let roomAuthorization =
        this.roomAuthorizationService.applyAuthorizationPolicy(
          conversation.room,
          conversation.authorization
        );
      roomAuthorization =
        this.roomAuthorizationService.allowContributorsToCreateMessages(
          roomAuthorization
        );
      roomAuthorization =
        this.roomAuthorizationService.allowContributorsToReplyReactToMessages(
          roomAuthorization
        );
      updatedAuthorizations.push(roomAuthorization);
    }

    return updatedAuthorizations;
  }

  private createCredentialRuleContributors(
    userIDs: string[]
  ): IAuthorizationPolicyRuleCredential {
    const contributorCriterias: ICredentialDefinition[] = userIDs.map(
      userID => ({
        type: AuthorizationCredential.USER_SELF_MANAGEMENT,
        resourceID: userID,
      })
    );
    const contributorsRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.CONTRIBUTE],
        contributorCriterias,
        'Communication Conversation Contributors'
      );
    contributorsRule.cascade = true;
    return contributorsRule;
  }
}
