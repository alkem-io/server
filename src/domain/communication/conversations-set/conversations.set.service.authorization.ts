import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ConversationAuthorizationService } from '../conversation/conversation.service.authorization';
import { IConversationsSet } from './conversations.set.interface';
import { ConversationsSetService } from './conversations.set.service';
import { ForbiddenException } from '@common/exceptions/forbidden.exception';
import { LogContext } from '@common/enums/logging.context';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';

@Injectable()
export class ConversationsSetAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private conversationsSetService: ConversationsSetService,
    private conversationAuthorizationService: ConversationAuthorizationService,
    private userLookupService: UserLookupService
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
            hostUserID,
            parentAuthorization
          );
        updatedAuthorizations.push(...conversationAuthorizations);
      }
    }

    return updatedAuthorizations;
  }

  public async resetAuthorizationOnConversations(
    hostUserID: string,
    receiverUserID: string,
    type: CommunicationConversationType
  ) {
    // Reset the authorization policies for the conversation
    await this.resetConversationAuthorization(hostUserID, receiverUserID);
    if (type === CommunicationConversationType.USER_USER) {
      await this.resetConversationAuthorization(receiverUserID, hostUserID);
    }
  }

  private async resetConversationAuthorization(
    hostUserID: string,
    receiverUserID: string
  ) {
    const hostUser = await this.userLookupService.getUserOrFail(hostUserID, {
      relations: {
        authorization: true,
        conversationsSet: {
          authorization: true,
          conversations: {
            authorization: true,
          },
        },
      },
    });
    if (!hostUser.conversationsSet) {
      throw new ForbiddenException(
        `Unable to access user(${hostUser.id}) as they do not have a conversations set.`,
        LogContext.COMMUNICATION
      );
    }
    const hostConversationWithReceiver =
      hostUser.conversationsSet.conversations.find(
        conversation => conversation.userID === receiverUserID
      );
    if (!hostConversationWithReceiver) {
      throw new ForbiddenException(
        'Host user does not have a conversation with the receiver user.',
        LogContext.COMMUNICATION,
        {
          hostUserID,
          receiverUserID,
        }
      );
    }
    const hostConversationWithReceiverAuthorizations =
      await this.conversationAuthorizationService.applyAuthorizationPolicy(
        hostConversationWithReceiver.id,
        hostUserID,
        hostUser.conversationsSet.authorization
      );

    await this.authorizationPolicyService.saveAll(
      hostConversationWithReceiverAuthorizations
    );
  }
}
