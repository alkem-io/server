import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ConversationAuthorizationService } from '../conversation/conversation.service.authorization';
import { IMessaging } from './messaging.interface';
import { MessagingService } from './messaging.service';

@Injectable()
export class MessagingAuthorizationService {
  constructor(
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly messagingService: MessagingService,
    private readonly conversationAuthorizationService: ConversationAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    messagingInput: IMessaging,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const messaging = await this.messagingService.getMessagingOrFail(
      messagingInput.id,
      {
        relations: {
          authorization: true,
          conversations: true,
        },
      }
    );

    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    // Inherit from the parent
    messaging.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        messaging.authorization,
        parentAuthorization
      );

    updatedAuthorizations.push(messaging.authorization);

    if (messaging.conversations) {
      for (const conversation of messaging.conversations) {
        const conversationAuthorizations =
          await this.conversationAuthorizationService.applyAuthorizationPolicy(
            conversation.id
          );
        updatedAuthorizations.push(...conversationAuthorizations);
      }
    }

    return updatedAuthorizations;
  }
}
