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
    conversationHostID: string
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

    // Determine all participants in the conversation
    const participantUserIDs: string[] = [conversationHostID];
    if (
      conversation.type === CommunicationConversationType.USER_USER &&
      conversation.userID
    ) {
      participantUserIDs.push(conversation.userID);
    }

    // Add READ + CONTRIBUTE access only for the conversation participants
    // This restricts who can view and interact with the conversation to only the participants
    conversation.authorization.credentialRules.push(
      this.createCredentialRuleParticipantAccess(participantUserIDs)
    );

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

  private createCredentialRuleParticipantAccess(
    userIDs: string[]
  ): IAuthorizationPolicyRuleCredential {
    const participantCriterias: ICredentialDefinition[] = userIDs.map(
      userID => ({
        type: AuthorizationCredential.USER_SELF_MANAGEMENT,
        resourceID: userID,
      })
    );
    const participantRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.READ, AuthorizationPrivilege.CONTRIBUTE],
        participantCriterias,
        'Communication Conversation Participants Access'
      );
    participantRule.cascade = true;
    return participantRule;
  }
}
