import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { BlobStoreKind } from '@common/enums/blob.store.kind';
import { EntityNotFoundException } from '@common/exceptions';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { MemoService } from '@domain/common/memo';
import { WhiteboardService } from '@domain/common/whiteboard';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  ContributionInputData,
  DeleteInputData,
  FetchInputData,
  InfoInputData,
  SaveInputData,
} from './inputs';
import {
  DeleteOutputData,
  deleteError,
  deleteSuccess,
  FetchOutputData,
  fetchError,
  fetchNotFound,
  InfoOutputData,
  SaveOutputData,
  saveError,
  saveSuccess,
} from './outputs';
import { CollaborationContentType, CollaborationErrorCode } from './types';

/**
 * Unified collaboration persistence/lifecycle consumer (server is the
 * RESPONDER). Hosts the new unified `collaboration-*` contract that replaces
 * the two legacy dialects (memo `collaboration-document-*`, whiteboard
 * `save`/`fetch`/...). Routes by `contentType` to the memo / whiteboard domain
 * services. The blob NEVER crosses this bus — only the metadata/index does
 * (FR-002/FR-003; `contracts/unified-metadata-rmq.md`).
 */
@Injectable()
export class CollaborationIntegrationService {
  private readonly memoMaxCollaboratorsInRoom: number;
  private readonly whiteboardMaxCollaboratorsInRoom: number;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly authorizationService: AuthorizationService,
    private readonly actorContextService: ActorContextService,
    private readonly memoService: MemoService,
    private readonly whiteboardService: WhiteboardService,
    private readonly contributionReporter: ContributionReporterService,
    private readonly communityResolver: CommunityResolverService,
    private readonly configService: ConfigService<AlkemioConfig, true>
  ) {
    this.memoMaxCollaboratorsInRoom = this.configService.get(
      'collaboration.memo.max_collaborators_in_room',
      { infer: true }
    );
    this.whiteboardMaxCollaboratorsInRoom = this.configService.get(
      'collaboration.whiteboards.max_collaborators_in_room',
      { infer: true }
    );
  }

  /**
   * `collaboration-save` — upsert the index row (FR-003). The blob is held by
   * the collab service's BlobStore; the server records only where it lives
   * (`contentPointer` + `blobStore`). The room OWNS the `version`
   * (`contracts/persistence-ports.md`): the value it sends is persisted
   * verbatim and round-tripped back on `collaboration-fetch` (FR-004) — the
   * server does not substitute its own counter.
   */
  public async save(data: SaveInputData): Promise<SaveOutputData> {
    if (!this.isKnownContentType(data.contentType)) {
      // Reject unknown/missing contentType deterministically rather than
      // routing it to the whiteboard write path. Identifiers stay in the
      // structured log; the reply carries only a typed error code.
      this.logger.error?.(
        {
          message: 'Unknown contentType',
          contentType: data.contentType,
          id: data.id,
        },
        undefined,
        LogContext.COLLABORATION_INTEGRATION
      );
      return saveError(CollaborationErrorCode.UNKNOWN_CONTENT_TYPE);
    }

    if (!this.isKnownBlobStore(data.blobStore)) {
      this.logger.error?.(
        {
          message: 'Unknown blobStore',
          blobStore: data.blobStore,
          id: data.id,
        },
        undefined,
        LogContext.COLLABORATION_INTEGRATION
      );
      return saveError(CollaborationErrorCode.UNKNOWN_BLOB_STORE);
    }

    try {
      const update = {
        version: data.version,
        contentPointer: data.contentPointer,
        blobStore: data.blobStore,
      };
      if (data.contentType === CollaborationContentType.MEMO) {
        await this.memoService.saveCollaborationMetadata(data.id, update);
      } else {
        await this.whiteboardService.saveCollaborationMetadata(data.id, update);
      }
      return saveSuccess();
    } catch (e: any) {
      // Log the raw cause server-side; reply with only a typed error code so
      // DB/stack details never cross the bus.
      this.logger.error?.(
        e?.message,
        e?.stack,
        LogContext.COLLABORATION_INTEGRATION
      );
      return saveError(CollaborationErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * `collaboration-fetch` — return the index row incl. `authorizationPolicyId`
   * (FR-005). A missing document yields a structured `{ found: false }` — no
   * exception leaks (FR-004).
   */
  public async fetch(data: FetchInputData): Promise<FetchOutputData> {
    // Try memo first, then whiteboard — the id namespace is shared and a given
    // id is at most one of the two. A miss on both is `not found`.
    try {
      const memo = await this.tryGetMemoMetadata(data.id);
      if (memo) {
        return {
          found: true,
          contentType: CollaborationContentType.MEMO,
          version: memo.version,
          contentPointer: memo.contentPointer,
          blobStore: memo.blobStore,
          authorizationPolicyId: memo.authorizationPolicyId,
          // The memo's OWN storage bucket — collab persists this doc's snapshot
          // there, not into a single flat platform bucket.
          storageBucketId: memo.storageBucketId,
        };
      }

      const whiteboard = await this.tryGetWhiteboardMetadata(data.id);
      if (whiteboard) {
        return {
          found: true,
          contentType: CollaborationContentType.WHITEBOARD,
          version: whiteboard.version,
          contentPointer: whiteboard.contentPointer,
          blobStore: whiteboard.blobStore,
          authorizationPolicyId: whiteboard.authorizationPolicyId,
          // The whiteboard's OWN storage bucket (see memo note above).
          storageBucketId: whiteboard.storageBucketId,
        };
      }

      return fetchNotFound();
    } catch (e: any) {
      this.logger.error?.(
        e?.message,
        e?.stack,
        LogContext.COLLABORATION_INTEGRATION
      );
      return fetchError(CollaborationErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * `collaboration-delete` — idempotently purge the index row on the
   * owner-delete cascade. Deleting an absent row is success (the contract /
   * FR-006). Entity lifecycle stays owner-driven; this only forgets the index.
   */
  public async delete(data: DeleteInputData): Promise<DeleteOutputData> {
    try {
      await this.memoService.deleteCollaborationMetadata(data.id);
      await this.whiteboardService.deleteCollaborationMetadata(data.id);
      return deleteSuccess();
    } catch (e: any) {
      // The domain delete uses an idempotent UPDATE that does not throw on a
      // missing row, so a not-found never reaches here — any error is a real
      // failure. Log the cause server-side; reply with only a typed error code.
      this.logger.error?.(
        e?.message,
        e?.stack,
        LogContext.COLLABORATION_INTEGRATION
      );
      return deleteError(CollaborationErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * `collaboration-info` — collaborator-mode inputs for an actor + document
   * (read / update / maxCollaborators / isMultiUser). Mirrors the legacy `info`
   * authZ decision: `read` for read, `update-content` for collaborate, against
   * the entity's own authorization policy (OPEN-1).
   */
  public async info(data: InfoInputData): Promise<InfoOutputData> {
    // Like save/fetch/delete, the responder must never throw on the bus: a
    // metadata-lookup or service failure normalizes to a deny.
    try {
      const memo = await this.tryGetMemoMetadata(data.id);
      if (memo) {
        return this.infoForMemo(data.actorId, data.id);
      }
      const whiteboard = await this.tryGetWhiteboardMetadata(data.id);
      if (whiteboard) {
        return this.infoForWhiteboard(data.actorId, data.id);
      }
      // Unknown document — deny.
      return { read: false, update: false };
    } catch (e: any) {
      this.logger.error?.(
        e?.message,
        e?.stack,
        LogContext.COLLABORATION_INTEGRATION
      );
      return { read: false, update: false };
    }
  }

  /**
   * `collaboration-contribution` (fire-and-forget) — the per-window set of
   * contributing actors. Routes by id to the memo / whiteboard contribution
   * reporter (carried forward from the two legacy contribution events).
   */
  public async contribution(data: ContributionInputData): Promise<void> {
    // Fire-and-forget event handler: like save/fetch/delete/info, it must never
    // throw on the bus. A metadata lookup or downstream reporter failure is
    // logged and swallowed rather than failing RMQ message handling.
    try {
      if (await this.tryGetMemoMetadata(data.id)) {
        return await this.reportMemoContribution(data);
      }
      if (await this.tryGetWhiteboardMetadata(data.id)) {
        return await this.reportWhiteboardContribution(data);
      }
      this.logger.warn?.(
        {
          message: 'collaboration-contribution for unknown document',
          id: data.id,
        },
        LogContext.COLLABORATION_INTEGRATION
      );
    } catch (e: any) {
      this.logger.error?.(
        e?.message,
        e?.stack,
        LogContext.COLLABORATION_INTEGRATION
      );
    }
  }

  private async infoForMemo(
    actorId: string,
    memoId: string
  ): Promise<InfoOutputData> {
    const read = await this.accessGrantedMemo(
      actorId,
      memoId,
      AuthorizationPrivilege.READ
    );
    if (!read) {
      return { read: false, update: false, isMultiUser: false };
    }
    const update = await this.accessGrantedMemo(
      actorId,
      memoId,
      AuthorizationPrivilege.UPDATE_CONTENT
    );
    const isMultiUser = await this.memoService.isMultiUser(memoId);
    const maxCollaborators = isMultiUser ? this.memoMaxCollaboratorsInRoom : 1;
    return { read, update, isMultiUser, maxCollaborators };
  }

  private async infoForWhiteboard(
    actorId: string,
    whiteboardId: string
  ): Promise<InfoOutputData> {
    const read = await this.accessGrantedWhiteboard(
      actorId,
      whiteboardId,
      AuthorizationPrivilege.READ
    );
    if (!read) {
      return { read: false, update: false };
    }
    const update = await this.accessGrantedWhiteboard(
      actorId,
      whiteboardId,
      AuthorizationPrivilege.UPDATE_CONTENT
    );
    const maxCollaborators = (await this.whiteboardService.isMultiUser(
      whiteboardId
    ))
      ? this.whiteboardMaxCollaboratorsInRoom
      : 1;
    return { read, update, maxCollaborators };
  }

  private async accessGrantedMemo(
    actorId: string,
    memoId: string,
    privilege: AuthorizationPrivilege
  ): Promise<boolean> {
    try {
      const memo = await this.memoService.getMemoOrFail(memoId);
      const actorContext = await this.actorContextService.buildForUser(actorId);
      return this.authorizationService.isAccessGranted(
        actorContext,
        memo.authorization,
        privilege
      );
    } catch (e: any) {
      this.logger.error?.(
        e?.message,
        e?.stack,
        LogContext.COLLABORATION_INTEGRATION
      );
      return false;
    }
  }

  private async accessGrantedWhiteboard(
    actorId: string,
    whiteboardId: string,
    privilege: AuthorizationPrivilege
  ): Promise<boolean> {
    try {
      const whiteboard =
        await this.whiteboardService.getWhiteboardOrFail(whiteboardId);
      const actorContext = await this.actorContextService.buildForUser(actorId);
      return this.authorizationService.isAccessGranted(
        actorContext,
        whiteboard.authorization,
        privilege
      );
    } catch (e: any) {
      this.logger.error?.(
        e?.message,
        e?.stack,
        LogContext.COLLABORATION_INTEGRATION
      );
      return false;
    }
  }

  private async reportMemoContribution(
    data: ContributionInputData
  ): Promise<void> {
    const community = await this.communityResolver.getCommunityForMemoOrFail(
      data.id
    );
    const levelZeroSpaceID =
      await this.communityResolver.getLevelZeroSpaceIdForCommunity(
        community.id
      );
    const { displayName } = await this.memoService.getProfile(data.id);
    data.users.forEach(({ id }) =>
      this.contributionReporter.memoContribution(
        { id: data.id, name: displayName, space: levelZeroSpaceID },
        { actorID: id }
      )
    );
  }

  private async reportWhiteboardContribution(
    data: ContributionInputData
  ): Promise<void> {
    const community =
      await this.communityResolver.getCommunityFromWhiteboardOrFail(data.id);
    const levelZeroSpaceID =
      await this.communityResolver.getLevelZeroSpaceIdForCommunity(
        community.id
      );
    const { displayName } = await this.whiteboardService.getProfile(data.id);
    data.users.forEach(({ id }) =>
      this.contributionReporter.whiteboardContribution(
        { id: data.id, name: displayName, space: levelZeroSpaceID },
        { actorID: id }
      )
    );
  }

  private async tryGetMemoMetadata(id: string) {
    try {
      return await this.memoService.getCollaborationMetadata(id);
    } catch (e: any) {
      if (e instanceof EntityNotFoundException) {
        return undefined;
      }
      throw e;
    }
  }

  private async tryGetWhiteboardMetadata(id: string) {
    try {
      return await this.whiteboardService.getCollaborationMetadata(id);
    } catch (e: any) {
      if (e instanceof EntityNotFoundException) {
        return undefined;
      }
      throw e;
    }
  }

  private isKnownContentType(
    value: unknown
  ): value is CollaborationContentType {
    return (
      value === CollaborationContentType.MEMO ||
      value === CollaborationContentType.WHITEBOARD
    );
  }

  private isKnownBlobStore(value: string): value is BlobStoreKind {
    return (Object.values(BlobStoreKind) as string[]).includes(value);
  }
}
