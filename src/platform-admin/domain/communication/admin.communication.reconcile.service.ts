import { LogContext } from '@common/enums';
import { asyncForEachBounded } from '@common/utils/async.for.each.bounded';
import { ConversationRepairService } from '@domain/communication/conversation/conversation.repair.service';
import { ConversationService } from '@domain/communication/conversation/conversation.service';
import { ConversationRoomRepairOutcome } from '@domain/communication/conversation/dto/conversation.repair.result';
import { isConversationKind } from '@domain/communication/proxy-surface/proxy.surface.disposition';
import {
  RoomReadinessReason,
  RoomReadinessState,
} from '@domain/communication/room/dto/room.readiness';
import { Room } from '@domain/communication/room/room.entity';
import { IRoom } from '@domain/communication/room/room.interface';
import { RoomReadinessService } from '@domain/communication/room/room.readiness.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { isRoomNotFoundError } from '@services/adapters/communication-adapter/communication.adapter.exception';
import { TaskService } from '@services/task';
import { Task } from '@services/task/task.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';

export const RECONCILE_PROBE_CONCURRENCY = 5;
const PROGRESS_EVERY = 50;

export type ReconcileConversationRoomsInput = {
  repair: boolean;
  includeReady: boolean;
};

/**
 * The result line of a sweep, readable through the task status. Rooms that a
 * repair brought back count as ready; rooms whose probe could not be answered
 * keep their readiness (an UNKNOWN one stays unknown and is counted).
 */
export type ReconcileConversationRoomsSummary = {
  scanned: number;
  ready: number;
  failed: number;
  repaired: number;
  repairFailed: number;
  unknownRemaining: number;
};

/**
 * Operator reconciliation sweep: probes rooms of every kind through the
 * adapter, records readiness (retiring UNKNOWN), and optionally repairs
 * conversation rooms the backend does not have. Runs as a background task
 * with bounded probe concurrency; re-running is idempotent.
 */
@Injectable()
export class AdminCommunicationReconcileService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    private readonly communicationAdapter: CommunicationAdapter,
    private readonly roomReadinessService: RoomReadinessService,
    private readonly conversationService: ConversationService,
    private readonly conversationRepairService: ConversationRepairService,
    private readonly taskService: TaskService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  /** Create the task and start the sweep without awaiting it. */
  async start(input: ReconcileConversationRoomsInput): Promise<Task> {
    const task = await this.taskService.create();
    void this.run(task.id, input);
    return task;
  }

  async run(
    taskId: string,
    input: ReconcileConversationRoomsInput
  ): Promise<ReconcileConversationRoomsSummary | undefined> {
    const summary: ReconcileConversationRoomsSummary = {
      scanned: 0,
      ready: 0,
      failed: 0,
      repaired: 0,
      repairFailed: 0,
      unknownRemaining: 0,
    };

    try {
      const rooms = await this.loadRooms(input.includeReady);
      await this.taskService.updateTaskResults(
        taskId,
        `Probing ${rooms.length} rooms (repair=${input.repair}, includeReady=${input.includeReady})`
      );

      await asyncForEachBounded(
        rooms,
        RECONCILE_PROBE_CONCURRENCY,
        async room => {
          await this.reconcileRoom(room, input.repair, summary);
          if (summary.scanned % PROGRESS_EVERY === 0) {
            await this.taskService.updateTaskResults(
              taskId,
              `Probed ${summary.scanned}/${rooms.length} rooms`
            );
          }
        }
      );

      await this.taskService.updateTaskResults(taskId, JSON.stringify(summary));
      await this.taskService.complete(taskId);
      this.logger.verbose?.(
        `Room readiness reconciliation completed: ${JSON.stringify(summary)}`,
        LogContext.COMMUNICATION
      );
      return summary;
    } catch (error: any) {
      this.logger.error?.(
        `Room readiness reconciliation failed: ${error?.message}`,
        error?.stack,
        LogContext.COMMUNICATION
      );
      await this.taskService.completeWithError(
        taskId,
        `Reconciliation failed after ${summary.scanned} rooms: ${error?.message}`
      );
      return undefined;
    }
  }

  private async loadRooms(includeReady: boolean): Promise<Room[]> {
    const query = this.roomRepository
      .createQueryBuilder('room')
      .select([
        'room.id',
        'room.type',
        'room.displayName',
        'room.avatarUrl',
        'room.readiness',
        'room.createdDate',
      ])
      .orderBy('room.createdDate', 'ASC');
    if (!includeReady) {
      query.where("room.readiness->>'state' <> :ready", {
        ready: RoomReadinessState.READY,
      });
    }
    return query.getMany();
  }

  private async reconcileRoom(
    room: IRoom,
    repair: boolean,
    summary: ReconcileConversationRoomsSummary
  ): Promise<void> {
    summary.scanned++;
    const wasUnknown = room.readiness?.state === RoomReadinessState.UNKNOWN;

    try {
      await this.communicationAdapter.getRoomMembers(room.id);
    } catch (error) {
      if (!isRoomNotFoundError(error)) {
        // The backend could not answer; readiness stays as recorded.
        this.logger.warn?.(
          `Reconcile: probe of room ${room.id} failed, readiness left unchanged: ${(error as Error)?.message}`,
          LogContext.COMMUNICATION
        );
        if (wasUnknown) summary.unknownRemaining++;
        return;
      }

      await this.roomReadinessService.record(
        room,
        {
          state: RoomReadinessState.FAILED,
          reason: RoomReadinessReason.ROOM_MISSING,
          detail: 'The messaging backend has no room for this platform room.',
        },
        'PROBE'
      );

      if (repair && isConversationKind(room.type)) {
        const conversation =
          await this.conversationService.findConversationByRoomId(room.id);
        if (conversation) {
          const result =
            await this.conversationRepairService.repair(conversation);
          if (result.outcome !== ConversationRoomRepairOutcome.FAILED) {
            summary.repaired++;
            summary.ready++;
            return;
          }
          summary.repairFailed++;
        }
      }
      summary.failed++;
      return;
    }

    await this.roomReadinessService.record(
      room,
      {
        state: RoomReadinessState.READY,
        reason: RoomReadinessReason.VERIFIED,
      },
      'PROBE'
    );
    summary.ready++;
  }
}
