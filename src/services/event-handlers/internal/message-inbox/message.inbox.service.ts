import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { MutationType } from '@common/enums/subscriptions';
import { RoomType } from '@common/enums/room.type';
import { MessageReceivedEvent } from './message.received.event';
import { ReactionAddedEvent } from './reaction.added.event';
import { ReactionRemovedEvent } from './reaction.removed.event';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { VirtualContributorMessageService } from '@domain/communication/virtual.contributor.message/virtual.contributor.message.service';
import { RoomLookupService } from '@domain/communication/room-lookup/room.lookup.service';
import { RoomMentionsService } from '@domain/communication/room-mentions/room.mentions.service';
import { MentionedEntityType } from '@domain/communication/messaging/mention.interface';
import { ActorContextService } from '@core/actor-context';

/**
 * Domain service for processing incoming messages from Matrix.
 *
 * Orchestrates the flow:
 * 1) EXISTING THREAD: Check sender ≠ main VC, invoke main VC
 * 2) NEW THREAD: Parse mentions, add first VC, invoke all mentioned
 */
@Injectable()
export class MessageInboxService {
  constructor(
    private readonly roomLookupService: RoomLookupService,
    private readonly roomMentionsService: RoomMentionsService,
    private readonly virtualContributorLookupService: VirtualContributorLookupService,
    private readonly virtualContributorMessageService: VirtualContributorMessageService,
    private readonly subscriptionPublishService: SubscriptionPublishService,
    private readonly actorContextService: ActorContextService,
    private readonly communicationAdapter: CommunicationAdapter,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @OnEvent('message.received')
  async handleMessageReceived(event: MessageReceivedEvent): Promise<void> {
    const { payload } = event;

    this.logger.verbose?.(
      `Processing incoming message: roomId=${payload.roomId}, messageId=${payload.message.id}, actorID=${payload.actorID}`,
      LogContext.COMMUNICATION
    );

    // Lookup room
    const room = await this.roomLookupService.getRoomOrFail(payload.roomId);

    this.logger.verbose?.(
      `Publishing subscription for room: roomId=${room.id}, messageId=${payload.message.id}`,
      LogContext.COMMUNICATION
    );

    // Publish GraphQL subscription - Matrix has confirmed message persistence
    this.subscriptionPublishService.publishRoomEvent(
      room,
      MutationType.CREATE,
      {
        id: payload.message.id,
        message: payload.message.message,
        sender: payload.actorID,
        threadID: payload.message.threadID || '',
        timestamp: payload.message.timestamp,
        reactions: [],
      }
    );

    // Check if this is a 1:1 conversation (USER_USER or USER_VC) - invoke VC members
    if (
      room.type === RoomType.CONVERSATION_DIRECT ||
      room.type === RoomType.CONVERSATION
    ) {
      await this.handleDirectConversation(payload, room);
      return;
    }

    // Determine threadID: use existing or message ID as new thread root
    const threadID = payload.message.threadID || payload.message.id;

    // Check if this thread has an existing VC interaction
    const threadInteraction = room.vcData?.interactionsByThread?.[threadID];

    if (threadInteraction) {
      await this.handleExistingThread(
        payload,
        room,
        threadID,
        threadInteraction
      );
    } else {
      await this.handleNewThread(payload, room, threadID);
    }
  }

  /**
   * Handle 1:1 conversation rooms (USER_USER or USER_VC).
   * Invokes all VC members in the room, excluding the message sender.
   */
  private async handleDirectConversation(
    payload: any,
    room: any
  ): Promise<void> {
    this.logger.verbose?.(
      `Processing 1:1 conversation: roomId=${payload.roomId}, type=${room.type}`,
      LogContext.COMMUNICATION
    );

    // Get room members from Matrix (lightweight call - no message history)
    const members = await this.communicationAdapter.getRoomMembers(room.id);

    // Filter out the sender
    const otherMembers = members.filter(actorID => actorID !== payload.actorID);

    if (otherMembers.length === 0) {
      this.logger.verbose?.(
        `No other members in conversation room ${room.id}, skipping`,
        LogContext.COMMUNICATION
      );
      return;
    }

    // Find all VCs among other members
    // VirtualContributor IS an Actor - actorId = virtualContributor.id
    const vcMembers = [];
    for (const actorID of otherMembers) {
      const vc =
        await this.virtualContributorLookupService.getVirtualContributorById(
          actorID
        );
      if (vc) {
        vcMembers.push(actorID);
      }
    }

    if (vcMembers.length === 0) {
      this.logger.verbose?.(
        `No VC members found in conversation room ${room.id}, skipping`,
        LogContext.COMMUNICATION
      );
      return;
    }

    // Build ActorContext from sender
    const actorContext = await this.actorContextService.buildForActor(
      payload.actorID
    );

    // Use message ID as threadID for DIRECT conversations
    const threadID = payload.message.id;

    // Invoke all VCs in parallel
    this.logger.verbose?.(
      `Invoking ${vcMembers.length} VC(s) in conversation room ${room.id}`,
      LogContext.COMMUNICATION
    );

    await Promise.all(
      vcMembers.map(vcActorID =>
        this.virtualContributorMessageService.invokeVirtualContributor(
          vcActorID,
          payload.message.message,
          threadID,
          actorContext,
          '', // contextSpaceID out of scope
          room
        )
      )
    );
  }

  private async handleExistingThread(
    payload: any,
    room: any,
    threadID: string,
    vcData: any
  ): Promise<void> {
    // Check if sender is NOT the main VC (avoid infinite loop)
    if (payload.actorID === vcData.virtualContributorActorID) {
      this.logger.verbose?.(
        `Ignoring message from VC itself (actorID=${payload.actorID})`,
        LogContext.COMMUNICATION
      );
      return;
    }

    // Invoke the main VC for this thread
    this.logger.verbose?.(
      `Invoking VC for existing thread: threadID=${threadID}, vcActorID=${vcData.virtualContributorActorID}`,
      LogContext.COMMUNICATION
    );

    // Build ActorContext from sender
    const actorContext = await this.actorContextService.buildForActor(
      payload.actorID
    );

    await this.virtualContributorMessageService.invokeVirtualContributor(
      vcData.virtualContributorActorID,
      payload.message.message,
      threadID,
      actorContext,
      '', // contextSpaceID out of scope
      room
    );
  }

  private async handleNewThread(
    payload: any,
    room: any,
    threadID: string
  ): Promise<void> {
    this.logger.verbose?.(
      `New thread detected: threadID=${threadID}, parsing mentions`,
      LogContext.COMMUNICATION
    );

    const mentions = await this.roomMentionsService.getMentionsFromText(
      payload.message.message
    );

    const vcMentions = mentions.filter(
      m => m.contributorType === MentionedEntityType.VIRTUAL_CONTRIBUTOR
    );

    if (vcMentions.length === 0) {
      this.logger.verbose?.(
        'No VC mentions found in new thread, skipping VC invocation',
        LogContext.COMMUNICATION
      );
      return;
    }

    // Build ActorContext from sender
    const actorContext = await this.actorContextService.buildForActor(
      payload.actorID
    );

    // Process all VC mentions
    await this.roomMentionsService.processVirtualContributorMentions(
      vcMentions,
      payload.message.message,
      threadID,
      actorContext,
      room
    );
  }

  /**
   * Handle reaction added event from Matrix.
   * Publishes GraphQL subscription after Matrix confirms the reaction.
   */
  @OnEvent('reaction.added')
  async handleReactionAdded(event: ReactionAddedEvent): Promise<void> {
    const { payload } = event;

    this.logger.verbose?.(
      `Processing reaction added: roomId=${payload.roomId}, messageId=${payload.messageId}, reactionId=${payload.reactionId}`,
      LogContext.COMMUNICATION
    );

    const room = await this.roomLookupService.getRoomOrFail(payload.roomId);

    // Publish GraphQL subscription - Matrix has confirmed reaction persistence
    this.subscriptionPublishService.publishRoomEvent(
      room,
      MutationType.CREATE,
      {
        id: payload.reactionId,
        emoji: payload.emoji,
        sender: payload.actorID,
        timestamp: payload.timestamp,
      },
      payload.messageId
    );
  }

  /**
   * Handle reaction removed event from Matrix.
   * Publishes GraphQL subscription after Matrix confirms the removal.
   */
  @OnEvent('reaction.removed')
  async handleReactionRemoved(event: ReactionRemovedEvent): Promise<void> {
    const { payload } = event;

    this.logger.verbose?.(
      `Processing reaction removed: roomId=${payload.roomId}, messageId=${payload.messageId}, reactionId=${payload.reactionId}`,
      LogContext.COMMUNICATION
    );

    const room = await this.roomLookupService.getRoomOrFail(payload.roomId);

    // Publish GraphQL subscription - Matrix has confirmed reaction removal
    this.subscriptionPublishService.publishRoomEvent(
      room,
      MutationType.DELETE,
      {
        id: payload.reactionId,
        emoji: '', // Not needed for delete
        sender: '',
        timestamp: Date.now(),
      },
      payload.messageId
    );
  }
}
