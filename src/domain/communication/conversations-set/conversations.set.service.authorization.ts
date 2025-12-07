import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ConversationAuthorizationService } from '../conversation/conversation.service.authorization';
import { IConversationsSet } from './conversations.set.interface';
import { ConversationsSetService } from './conversations.set.service';
import { ForbiddenException } from '@common/exceptions/forbidden.exception';
import { LogContext } from '@common/enums/logging.context';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';
import { ConversationService } from '../conversation/conversation.service';

@Injectable()
export class ConversationsSetAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private conversationsSetService: ConversationsSetService,
    private conversationAuthorizationService: ConversationAuthorizationService,
    private conversationService: ConversationService
  ) {}

  async applyAuthorizationPolicy(
    conversationsSetInput: IConversationsSet,
    hostUserID: string,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const conversationsSet =
      await this.conversationsSetService.getConversationsSetOrFail(
        conversationsSetInput.id,
        {
          relations: {
            authorization: true,
            conversations: true,
          },
        }
      );

    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    // Inherit from the parent
    conversationsSet.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        conversationsSet.authorization,
        parentAuthorization
      );

    updatedAuthorizations.push(conversationsSet.authorization);

    if (conversationsSet.conversations) {
      for (const conversation of conversationsSet.conversations) {
        const conversationAuthorizations =
          await this.conversationAuthorizationService.applyAuthorizationPolicy(
            conversation.id,
            hostUserID
          );
        updatedAuthorizations.push(...conversationAuthorizations);
      }
    }

    return updatedAuthorizations;
  }

  public async resetAuthorizationOnConversations(
    hostUserID: string,
    receiverUserID: string
  ) {
    // With membership-based architecture, there is only ONE conversation
    // between two users (not two "reciprocal" conversations).
    // We just need to reset authorization on that single conversation.
    await this.resetConversationAuthorization(hostUserID, receiverUserID);
  }

  /**
   * Reset authorization on the conversation between two users.
   * Uses platform conversation set and membership queries to find the conversation.
   */
  private async resetConversationAuthorization(
    hostUserID: string,
    receiverUserID: string
  ) {
    // Get conversations for the host user from the platform set
    const hostUserConversations =
      await this.conversationsSetService.getConversationsForUser(
        hostUserID,
        CommunicationConversationType.USER_USER
      );

    // Find the conversation with the receiver user
    let conversationWithReceiver;
    for (const conversation of hostUserConversations) {
      const otherUser = await this.conversationService.getUserFromConversation(
        conversation.id,
        hostUserID
      );
      if (otherUser?.id === receiverUserID) {
        conversationWithReceiver = conversation;
        break;
      }
    }

    if (!conversationWithReceiver) {
      throw new ForbiddenException(
        'Could not find conversation between the users.',
        LogContext.COMMUNICATION,
        {
          hostUserID,
          receiverUserID,
        }
      );
    }

    const conversationAuthorizations =
      await this.conversationAuthorizationService.applyAuthorizationPolicy(
        conversationWithReceiver.id,
        hostUserID
      );

    await this.authorizationPolicyService.saveAll(conversationAuthorizations);
  }
}
