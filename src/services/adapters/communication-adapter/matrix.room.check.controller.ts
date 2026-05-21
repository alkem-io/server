import {
  CheckRoomRequest,
  CheckRoomResponse,
  GetRoomInfoRequest,
  GetRoomInfoResponse,
  MatrixAdapterEventType,
} from '@alkemio/matrix-adapter-lib';
import { LogContext } from '@common/enums';
import { MessagingService } from '@domain/communication/messaging/messaging.service';
import { MessagingRejectionReason } from '@domain/communication/messaging/types/messaging.rejection.reasons';
import { RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

/**
 * RabbitMQ RPC entrypoint for the Element room-check flow (feature
 * 099-element-room-check). Two synchronous handlers on the
 * `alkemio-matrix-adapter` queue family:
 *
 *   - `communication.room.check`: validates actors + consent + dedup, creates
 *     the Conversation entity with a server-assigned UUID, returns allow/deny.
 *   - `communication.room.info`:  returns the registered membership for a
 *     given Alkemio room UUID; called by the adapter during reconciliation.
 *
 * Both handlers use `@RabbitRPC` (golevelup) — same decorator family as the
 * existing `@RabbitSubscribe` handlers in `CommunicationAdapterEventService`
 * (NestJS's `@MessagePattern` + `Transport.RMQ` would steal messages from the
 * golevelup consumer; see comment in `main.ts:110-112`).
 *
 * The handlers are thin orchestrators: parse the wire payload, call the
 * domain method on `MessagingService`, translate the internal `CheckResult`
 * (or `GetRoomInfoResult`) shape into the wire response envelope. All
 * business rules live in `MessagingService`.
 */
@Injectable()
export class MatrixRoomCheckController {
  constructor(
    private readonly messagingService: MessagingService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @RabbitRPC({
    queue: MatrixAdapterEventType.COMMUNICATION_ROOM_CHECK,
    routingKey: MatrixAdapterEventType.COMMUNICATION_ROOM_CHECK,
    createQueueIfNotExists: true,
    queueOptions: { durable: true },
  })
  async checkRoom(payload: CheckRoomRequest): Promise<CheckRoomResponse> {
    this.logger.verbose?.(
      `[${MatrixAdapterEventType.COMMUNICATION_ROOM_CHECK}] Event received: creator=${payload?.creator_actor_id}, members=${payload?.member_actor_ids?.length}, is_direct=${payload?.is_direct}`,
      LogContext.COMMUNICATION_CONVERSATION
    );

    try {
      const result = await this.messagingService.createConversationFromExternal(
        {
          creatorActorId: payload.creator_actor_id,
          memberActorIds: payload.member_actor_ids,
          isDirect: payload.is_direct,
        }
      );

      if (result.kind === 'accepted') {
        return { allow: true, alkemio_room_id: result.alkemioRoomId };
      }
      return { allow: false, reason: result.reason };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        'checkRoom: unexpected error in RPC handler',
        err?.stack,
        LogContext.COMMUNICATION_CONVERSATION
      );
      return {
        allow: false,
        reason: MessagingRejectionReason.INTERNAL_ERROR,
      };
    }
  }

  @RabbitRPC({
    queue: MatrixAdapterEventType.COMMUNICATION_ROOM_INFO,
    routingKey: MatrixAdapterEventType.COMMUNICATION_ROOM_INFO,
    createQueueIfNotExists: true,
    queueOptions: { durable: true },
  })
  async getRoomInfo(payload: GetRoomInfoRequest): Promise<GetRoomInfoResponse> {
    this.logger.verbose?.(
      `[${MatrixAdapterEventType.COMMUNICATION_ROOM_INFO}] Event received: alkemio_room_id=${payload?.alkemio_room_id}`,
      LogContext.COMMUNICATION_CONVERSATION
    );

    try {
      const result = await this.messagingService.getRoomInfo(
        payload.alkemio_room_id
      );
      return {
        alkemio_room_id: payload.alkemio_room_id,
        type: result.type,
        is_direct: result.isDirect,
        members: result.members.map(m => ({
          actor_id: m.actorId,
          display_name: m.displayName,
        })),
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        'getRoomInfo: unexpected error in RPC handler',
        err?.stack,
        LogContext.COMMUNICATION_CONVERSATION
      );
      return {
        alkemio_room_id: payload?.alkemio_room_id ?? '',
        type: '',
        is_direct: false,
        members: [],
      };
    }
  }
}
