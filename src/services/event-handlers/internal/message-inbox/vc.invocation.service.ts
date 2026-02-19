import { LogContext } from '@common/enums';
import { ActorType } from '@common/enums/actor.type';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { Actor } from '@domain/actor/actor/actor.entity';
import {
  Mention,
  MentionedEntityType,
} from '@domain/communication/messaging/mention.interface';
import { IRoom } from '@domain/communication/room/room.interface';
import { VirtualContributorMessageService } from '@domain/communication/virtual.contributor.message/virtual.contributor.message.service';
import { VirtualActorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager, In } from 'typeorm';
import { MessageNotificationService } from './message.notification.service';

/**
 * Payload structure for message events from Matrix.
 */
export interface MessagePayload {
  roomId: string;
  actorID: string;
  message: {
    id: string;
    message: string;
    threadID?: string;
    timestamp: number;
  };
}

/**
 * VC interaction data stored per thread.
 * Note: threadID is the map key in room.vcInteractionsByThread, not stored in this data.
 */
export interface VcInteractionData {
  virtualContributorActorID: string;
  externalThreadId?: string; // AI service thread ID
}

/**
 * Service responsible for invoking Virtual Contributors in response to messages.
 *
 * Handles three scenarios:
 * 1. Direct conversations - invoke all VC members in the room
 * 2. Existing threads - invoke the VC already associated with the thread
 * 3. New threads - invoke VCs mentioned in the message
 */
@Injectable()
export class VcInvocationService {
  constructor(
    private readonly virtualActorLookupService: VirtualActorLookupService,
    private readonly virtualContributorMessageService: VirtualContributorMessageService,
    private readonly communicationAdapter: CommunicationAdapter,
    private readonly actorContextService: ActorContextService,
    private readonly messageNotificationService: MessageNotificationService,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Process VC invocation for a message in a direct conversation.
   * Invokes all VC members in the room, excluding the message sender.
   */
  async processDirectConversation(
    payload: MessagePayload,
    room: IRoom
  ): Promise<void> {
    this.logger.verbose?.(
      `Processing DIRECT conversation: roomId=${payload.roomId}`,
      LogContext.COMMUNICATION
    );

    // Get room members from Matrix (lightweight call - no message history)
    const members = await this.communicationAdapter.getRoomMembers(room.id);

    // Filter out the sender
    const otherMembers = members.filter(
      (actorID: string) => actorID !== payload.actorID
    );

    if (otherMembers.length === 0) {
      this.logger.verbose?.(
        `No other members in room ${room.id}, skipping`,
        LogContext.COMMUNICATION
      );
      return;
    }

    // Find all VCs among other members (single query)
    const vcAgents = await this.entityManager.find(Actor, {
      where: {
        id: In(otherMembers),
        type: ActorType.VIRTUAL_CONTRIBUTOR,
      },
      select: ['id'],
    });
    const vcMembers = vcAgents.map(a => a.id);

    if (vcMembers.length === 0) {
      this.logger.verbose?.(
        `No VC members found in room ${room.id}, skipping`,
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
      `Invoking ${vcMembers.length} VC(s) in conversation`,
      LogContext.COMMUNICATION
    );

    const results = await Promise.allSettled(
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

    // Log any failed invocations
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.error(
          `Failed to invoke VC ${vcMembers[index]}: ${result.reason}`,
          result.reason?.stack,
          LogContext.COMMUNICATION
        );
      }
    });
  }

  /**
   * Process VC invocation for a message in an existing thread.
   * Invokes the VC already associated with the thread (if sender is not the VC).
   */
  async processExistingThread(
    payload: MessagePayload,
    room: IRoom,
    threadID: string,
    vcData: VcInteractionData
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

  /**
   * Process VC invocation for a message starting a new thread.
   * Parses mentions and invokes any mentioned VCs.
   */
  async processNewThread(
    payload: MessagePayload,
    room: IRoom,
    threadID: string
  ): Promise<void> {
    this.logger.verbose?.(
      `New thread detected: threadID=${threadID}, parsing mentions`,
      LogContext.COMMUNICATION
    );

    const mentions = await this.messageNotificationService.getMentionsFromText(
      payload.message.message
    );

    const vcMentions = mentions.filter(
      (m: Mention) => m.actorType === MentionedEntityType.VIRTUAL
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
    await this.messageNotificationService.processVirtualContributorMentions(
      vcMentions,
      payload.message.message,
      threadID,
      actorContext,
      room
    );
  }
}
