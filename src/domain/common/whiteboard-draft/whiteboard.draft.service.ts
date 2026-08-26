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
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, Not, Repository } from 'typeorm';
import { CreateWhiteboardDraftInput } from './dto';

const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface WhiteboardDraftMaterializationInput
  extends CreateWhiteboardDraftInput {
  sourceContent?: string;
  sourceStorageBucketID?: string;
}

/** A live draft is an ordinary Whiteboard with a non-NULL expiry marker. */
@Injectable()
export class WhiteboardDraftService {
  constructor(
    @InjectRepository(Whiteboard)
    private readonly repository: Repository<Whiteboard>,
    private readonly whiteboardService: WhiteboardService,
    private readonly whiteboardAuthorizationService: WhiteboardAuthorizationService,
    private readonly authorizationPolicyService: AuthorizationPolicyService
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

  async getForConsumption(
    whiteboardID: string,
    actorContext: ActorContext
  ): Promise<Whiteboard> {
    this.assertActor(actorContext);
    const draft = await this.repository.findOne({
      where: { id: whiteboardID },
    });
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
    return draft;
  }

  async discard(
    whiteboardID: string,
    actorContext: ActorContext
  ): Promise<string> {
    this.assertActor(actorContext);
    const draft = await this.repository.findOne({
      where: { id: whiteboardID },
    });
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
  }

  async cleanupConsumed(whiteboardID: string): Promise<void> {
    const draft = await this.repository.findOne({
      where: { id: whiteboardID, draftExpiresAt: Not(IsNull()) },
    });
    if (!draft) return;
    await this.whiteboardService.deleteWhiteboard(draft.id);
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
    // Recheck the exact id and expiry immediately before canonical deletion.
    const draft = await this.repository.findOne({
      where: {
        id: whiteboardID,
        draftExpiresAt: LessThanOrEqual(new Date()),
      },
    });
    if (!draft) return;
    await this.whiteboardService.deleteWhiteboard(draft.id);
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
