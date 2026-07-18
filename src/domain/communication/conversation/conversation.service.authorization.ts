import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { ActorType } from '@common/enums/actor.type';
import { EntityNotInitializedException } from '@common/exceptions';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { RoomAuthorizationService } from '@domain/communication/room/room.service.authorization';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { StorageBucketAuthorizationService } from '@domain/storage/storage-bucket/storage.bucket.service.authorization';
import { Injectable } from '@nestjs/common';
import { ConversationService } from './conversation.service';

@Injectable()
export class ConversationAuthorizationService {
  constructor(
    private conversationService: ConversationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private roomAuthorizationService: RoomAuthorizationService,
    private storageBucketAuthorizationService: StorageBucketAuthorizationService,
    private userLookupService: UserLookupService
  ) {}

  public async applyAuthorizationPolicy(
    conversationID: string
  ): Promise<IAuthorizationPolicy[]> {
    const conversation = await this.conversationService.getConversationOrFail(
      conversationID,
      {
        relations: {
          authorization: true,
          room: true,
          storageAggregator: {
            authorization: true,
            directStorage: {
              authorization: true,
              // Mirror the sibling StorageAggregatorAuthorizationService relation
              // spec EXACTLY (`documents: { tagset: true }`): the bucket auth
              // reset cascades into DocumentAuthorizationService.applyAuthorizationPolicy,
              // which dereferences `document.tagset` + `document.tagset.authorization`
              // (both throw RelationshipNotFoundException if unloaded). `authorization`
              // is eager on Document/Tagset (AuthorizableEntity), so requesting the
              // tagset relation is what makes the nested auth available once a
              // conversation has accrued attachment documents (FIX 0).
              documents: {
                tagset: true,
              },
            },
          },
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

    // T056: Determine all participants via membership pivot table
    const memberships =
      await this.conversationService.getConversationMembers(conversationID);

    // Resolve agent IDs to user IDs for authorization
    // Note: Current authorization system uses USER_SELF_MANAGEMENT credentials
    // In the future, this should be refactored to use agent-based credentials
    const participantUserIDs: string[] = [];
    for (const membership of memberships) {
      if (membership.actorType === ActorType.USER) {
        const user = await this.userLookupService.getUserById(
          membership.actorID
        );
        if (user) {
          participantUserIDs.push(user.id);
        }
      }
      // Note: Virtual contributors don't have user IDs, so they won't be included
      // in the authorization rules. This is acceptable since VCs interact via
      // the platform's service credentials, not user credentials.
    }

    // Add READ + CONTRIBUTE access for all user participants
    // T057: Membership grants both read and send message privileges
    // T058: Structured logging with conversation ID and agent IDs in exception details
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

    // Cascade to the per-conversation storage (feature 013). The bucket auth is
    // RESET + INHERITED from the Conversation's own (membership-based)
    // authorization — so READ on conversation attachments is granted to exactly
    // the same holders as conversation access, and follows membership changes
    // live. Crucially we DO NOT use the generic StorageAggregator auth here:
    // that grants anonymous/registered READ, which would expose attachments to
    // every signed-in user. Members get FILE_UPLOAD via the bucket's CONTRIBUTE
    // privilege rule; non-members inherit nothing and are denied (FR-007).
    const storageAggregator = conversation.storageAggregator;
    if (storageAggregator?.directStorage && storageAggregator.authorization) {
      storageAggregator.authorization = this.authorizationPolicyService.reset(
        storageAggregator.authorization
      );
      storageAggregator.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          storageAggregator.authorization,
          conversation.authorization
        );
      updatedAuthorizations.push(storageAggregator.authorization);

      // The bucket auth service resets+inherits the bucket from the aggregator
      // auth, appends file-upload/delete privilege rules, cascades to documents,
      // and persists internally (returns []).
      await this.storageBucketAuthorizationService.applyAuthorizationPolicy(
        storageAggregator.directStorage,
        storageAggregator.authorization
      );
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
        'Communication Conversation Participants Access (Membership-based)'
      );
    participantRule.cascade = true;
    return participantRule;
  }
}
