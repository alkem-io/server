import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ConversationAuthorizationService } from '../conversation/conversation.service.authorization';
import { IConversationsSet } from './conversations.set.interface';
import { ConversationsSetService } from './conversations.set.service';

@Injectable()
export class ConversationsSetAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private conversationsSetService: ConversationsSetService,
    private conversationAuthorizationService: ConversationAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    conversationsSetInput: IConversationsSet,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const conversationsSet =
      await this.conversationsSetService.getConversationsSetOrFail(
        conversationsSetInput.id,
        {
          relations: {
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
            parentAuthorization
          );
        updatedAuthorizations.push(...conversationAuthorizations);
      }
    }

    return updatedAuthorizations;
  }
}
