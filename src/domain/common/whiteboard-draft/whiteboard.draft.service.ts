import { randomUUID } from 'node:crypto';
import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  ForbiddenException,
  ValidationException,
} from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { WhiteboardAuthorizationService } from '@domain/common/whiteboard/whiteboard.service.authorization';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DataSource, LessThanOrEqual, QueryRunner, Repository } from 'typeorm';
import { CreateWhiteboardDraftInput } from './dto';

const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DRAFT_LOCK_TIMEOUT_MS = 5_000;

export interface WhiteboardDraftMaterializationInput
  extends CreateWhiteboardDraftInput {
  sourceContent?: string;
  sourceStorageBucketID?: string;
}

export interface WhiteboardDraftConsumption {
  drafts: ReadonlyMap<string, Whiteboard>;
  markConsumed(): Promise<void>;
  complete(): Promise<void>;
  release(): Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
}

/** A live draft is an ordinary Whiteboard with a non-NULL expiry marker. */
@Injectable()
export class WhiteboardDraftService {
  constructor(
    @InjectRepository(Whiteboard)
    private readonly repository: Repository<Whiteboard>,
    private readonly whiteboardService: WhiteboardService,
    private readonly whiteboardAuthorizationService: WhiteboardAuthorizationService,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async materialize(
    input: WhiteboardDraftMaterializationInput,
    storageAggregator: IStorageAggregator,
    parentAuthorization: IAuthorizationPolicy | undefined,
    actorContext: ActorContext
  ): Promise<string> {
    this.assertActor(actorContext);
    this.assertSources(input);
    const expiresAt = new Date(Date.now() + DRAFT_TTL_MS);
    const whiteboard = await this.whiteboardService.createWhiteboard(
      {
        profile: { displayName: 'Whiteboard draft' },
        nameID: randomUUID().slice(0, 8),
        sourceWhiteboardID: input.sourceWhiteboardID,
        content: input.sourceContent,
        sourceStorageBucketID: input.sourceStorageBucketID,
        draftExpiresAt: expiresAt,
      },
      storageAggregator,
      actorContext
    );
    try {
      const authorizations =
        await this.whiteboardAuthorizationService.applyAuthorizationPolicy(
          whiteboard.id,
          parentAuthorization
        );
      await this.authorizationPolicyService.saveAll(authorizations);
    } catch (error) {
      await this.whiteboardService.deleteWhiteboard(whiteboard.id);
      throw error;
    }
    return whiteboard.id;
  }

  async acquireForConsumption(
    whiteboardIDs: string[],
    actorContext: ActorContext
  ): Promise<WhiteboardDraftConsumption> {
    this.assertActor(actorContext);
    const draftIDs = [...new Set(whiteboardIDs)].sort();
    if (draftIDs.length === 0) {
      return {
        drafts: new Map(),
        markConsumed: async () => undefined,
        complete: async () => undefined,
        release: async () => undefined,
        [Symbol.asyncDispose]: async () => undefined,
      };
    }
    const queryRunner = await this.acquireLocks(draftIDs);
    let released = false;
    const release = async (): Promise<void> => {
      if (released) return;
      released = true;
      await this.releaseLocks(queryRunner, draftIDs);
    };

    try {
      const lockedRepository = queryRunner.manager.getRepository(Whiteboard);
      const drafts = new Map<string, Whiteboard>();
      for (const whiteboardID of draftIDs) {
        const draft = await lockedRepository.findOne({
          where: { id: whiteboardID },
        });
        this.assertConsumable(draft, whiteboardID, actorContext);
        drafts.set(whiteboardID, draft);
      }
      let consumed = false;
      const markConsumed = async (): Promise<void> => {
        if (consumed) return;
        await lockedRepository.update(draftIDs, {
          draftExpiresAt: new Date(0),
        });
        consumed = true;
      };
      return {
        drafts,
        markConsumed,
        complete: async () => {
          // Make every consumed draft immediately non-consumable while its
          // advisory lock is held. Canonical deletion also removes its files,
          // but a transient delete failure must not allow a retry to create a
          // second final Whiteboard from the same draft. The expiry sweep will
          // retry canonical deletion for any row left behind.
          await markConsumed();
          for (const draftID of draftIDs) {
            await this.whiteboardService
              .deleteWhiteboard(draftID)
              .catch(error => {
                this.logger.warn?.(
                  {
                    message:
                      'Consumed Whiteboard draft deletion failed; expiry sweep will retry',
                    whiteboardID: draftID,
                    error:
                      error instanceof Error ? error.message : String(error),
                  },
                  LogContext.WHITEBOARDS
                );
              });
          }
        },
        release,
        [Symbol.asyncDispose]: release,
      };
    } catch (error) {
      await release();
      throw error;
    }
  }

  async discard(
    whiteboardID: string,
    actorContext: ActorContext
  ): Promise<string> {
    this.assertActor(actorContext);
    return this.withLocks([whiteboardID], async queryRunner => {
      const draft = await queryRunner.manager
        .getRepository(Whiteboard)
        .findOne({ where: { id: whiteboardID } });
      if (!draft?.draftExpiresAt) return whiteboardID;
      if (draft.createdBy !== actorContext.actorID) {
        throw new ForbiddenException(
          'Only the actor that created a Whiteboard draft may discard it',
          LogContext.WHITEBOARDS,
          { whiteboardID }
        );
      }
      await this.whiteboardService.deleteWhiteboard(whiteboardID);
      return whiteboardID;
    });
  }

  async findExpired(limit: number): Promise<string[]> {
    // This is the complete cleanup corpus. Ordinary Whiteboards have NULL and
    // cannot be selected by this query.
    const drafts = await this.repository.find({
      select: { id: true },
      where: { draftExpiresAt: LessThanOrEqual(new Date()) },
      order: { draftExpiresAt: 'ASC' },
      take: limit,
    });
    return drafts.map(draft => draft.id);
  }

  async cleanupExpired(whiteboardID: string): Promise<void> {
    await this.withLocks([whiteboardID], async queryRunner => {
      // The sweep selection is only a candidate list. Re-read the marker while
      // holding the same cross-replica lock used by consumption and discard.
      const draft = await queryRunner.manager
        .getRepository(Whiteboard)
        .findOne({
          where: {
            id: whiteboardID,
            draftExpiresAt: LessThanOrEqual(new Date()),
          },
        });
      if (!draft) return;
      await this.whiteboardService.deleteWhiteboard(draft.id);
    });
  }

  private assertConsumable(
    draft: Whiteboard | null,
    whiteboardID: string,
    actorContext: ActorContext
  ): asserts draft is Whiteboard {
    if (!draft?.draftExpiresAt) {
      throw new EntityNotFoundException(
        'Whiteboard draft not found',
        LogContext.WHITEBOARDS,
        { whiteboardID }
      );
    }
    if (draft.createdBy !== actorContext.actorID) {
      throw new ForbiddenException(
        'Only the actor that created a Whiteboard draft may consume it',
        LogContext.WHITEBOARDS,
        { whiteboardID }
      );
    }
    if (draft.draftExpiresAt.getTime() <= Date.now()) {
      throw new ValidationException(
        'Whiteboard draft has expired',
        LogContext.WHITEBOARDS,
        { whiteboardID }
      );
    }
  }

  private async withLocks<T>(
    whiteboardIDs: string[],
    operation: (queryRunner: QueryRunner) => Promise<T>
  ): Promise<T> {
    const draftIDs = [...new Set(whiteboardIDs)].sort();
    const queryRunner = await this.acquireLocks(draftIDs);
    try {
      return await operation(queryRunner);
    } finally {
      await this.releaseLocks(queryRunner, draftIDs);
    }
  }

  private async acquireLocks(whiteboardIDs: string[]): Promise<QueryRunner> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    const acquiredIDs: string[] = [];
    try {
      await queryRunner.query(
        `SET lock_timeout = '${DRAFT_LOCK_TIMEOUT_MS}ms'`
      );
      for (const whiteboardID of whiteboardIDs) {
        await queryRunner.query(
          'SELECT pg_advisory_lock(hashtextextended($1, 0))',
          [`whiteboard-draft:${whiteboardID}`]
        );
        acquiredIDs.push(whiteboardID);
      }
      return queryRunner;
    } catch (error) {
      await this.releaseLocks(queryRunner, acquiredIDs);
      throw error;
    }
  }

  private async releaseLocks(
    queryRunner: QueryRunner,
    whiteboardIDs: string[]
  ): Promise<void> {
    let exactUnlockFailed = false;
    try {
      for (const whiteboardID of [...whiteboardIDs].reverse()) {
        try {
          await queryRunner.query(
            'SELECT pg_advisory_unlock(hashtextextended($1, 0))',
            [`whiteboard-draft:${whiteboardID}`]
          );
        } catch {
          exactUnlockFailed = true;
        }
      }
      if (exactUnlockFailed) {
        // A QueryRunner owns one PostgreSQL session exclusively. Clear any
        // lock left by a failed keyed unlock before returning that session to
        // the pool; otherwise an unrelated request could inherit the lock.
        await queryRunner.query('SELECT pg_advisory_unlock_all()');
      }
    } finally {
      try {
        await queryRunner.query('SET lock_timeout = DEFAULT');
      } finally {
        await queryRunner.release();
      }
    }
  }

  private assertActor(actorContext: ActorContext): void {
    if (!actorContext.actorID) {
      throw new ForbiddenException(
        'Whiteboard drafts require an authenticated actor',
        LogContext.WHITEBOARDS
      );
    }
  }

  private assertSources(input: CreateWhiteboardDraftInput): void {
    if (input.sourceWhiteboardID && input.sourceCalloutID) {
      throw new ValidationException(
        'sourceWhiteboardID and sourceCalloutID are mutually exclusive',
        LogContext.WHITEBOARDS
      );
    }
  }
}
