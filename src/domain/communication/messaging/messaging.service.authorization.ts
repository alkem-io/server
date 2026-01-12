import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ConversationAuthorizationService } from '../conversation/conversation.service.authorization';
import { IMessaging } from './messaging.interface';
import { MessagingService } from './messaging.service';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
} from '@common/enums';

@Injectable()
export class MessagingAuthorizationService {
  private static readonly CREDENTIAL_RULE_MESSAGING_CREATE_CONVERSATION =
    'messaging-create-conversation';

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

    // Allow registered users to create conversations
    // Note: Before the refactor (8f8887ce3), each user had their own conversationsSet
    // which inherited from their user authorization. Now with platform-owned messaging,
    // we need to explicitly grant CREATE to registered users.
    const createConversationRule =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.CREATE],
        [AuthorizationCredential.GLOBAL_REGISTERED],
        MessagingAuthorizationService.CREDENTIAL_RULE_MESSAGING_CREATE_CONVERSATION
      );
    createConversationRule.cascade = false;

    messaging.authorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        messaging.authorization,
        [createConversationRule]
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
