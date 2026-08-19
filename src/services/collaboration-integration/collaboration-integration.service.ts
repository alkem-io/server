import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { ActorType } from '@common/enums/actor.type';
import { EntityNotFoundException } from '@common/exceptions';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { CollaboraDocumentService } from '@domain/collaboration/collabora-document/collabora.document.service';
import { MemoService } from '@domain/common/memo';
import { WhiteboardService } from '@domain/common/whiteboard';
import {
  isAlkemioEmail,
  UserLookupService,
} from '@domain/community/user-lookup/user.lookup.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import {
  TypedActorSet,
  UNKNOWN_ACTOR_TYPE,
} from '@services/external/elasticsearch/types';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  ContributionInputData,
  DeleteInputData,
  FetchInputData,
  InfoInputData,
  OfficeDocumentContributionsInputData,
  OfficeDocumentRenameInputData,
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
    private readonly configService: ConfigService<AlkemioConfig, true>,
    private readonly collaboraDocumentService: CollaboraDocumentService,
    private readonly actorLookupService: ActorLookupService,
    private readonly userLookupService: UserLookupService
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
   * file-service (the single Alkemio storage backend); the server records only
   * where it lives (`contentPointer`). The room OWNS the `version`
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

    try {
      // Omit `contentPointer` when blank so the internal shape matches the
      // contract (blank = ABSENT, never `undefined`-as-a-field). Its sole
      // producer is the checkpoint store's metapointer `Record`; PreRegister /
      // Room.persist omit it, and the twin preserves the stored pointer.
      const update = {
        version: data.version,
        ...(data.contentPointer ? { contentPointer: data.contentPointer } : {}),
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

  /**
   * Consumes a Collabora office-document **contribution** window event
   * (`collaboration-office-document-contribution`) and indexes ONE aggregate
   * contribution record per (document, window). Collabora/WOPI is a distinct
   * modality from the Yjs memo/whiteboard contract handled above; it is hosted
   * here so the server has a single collaboration-integration consumer.
   */
  public async officeDocumentContributions(
    data: OfficeDocumentContributionsInputData
  ): Promise<void> {
    await this.reportOfficeDocumentWindow(data, 'contribution', contribution =>
      this.contributionReporter.officeDocumentContribution(contribution)
    );
  }

  /**
   * Companion of {@link officeDocumentContributions}: consumes a Collabora
   * office-document **view** event (`collaboration-office-document-view`) — a
   * window in which the document was active but not genuinely modified — and
   * indexes ONE aggregate VIEW record per (document, window). Same
   * reverse-resolution path; differs ONLY in the reporter method invoked. Per
   * (document, window) the producer emits either the contribution event or the
   * view event, never both.
   */
  public async officeDocumentViews(
    data: OfficeDocumentContributionsInputData
  ): Promise<void> {
    await this.reportOfficeDocumentWindow(data, 'view', contribution =>
      this.contributionReporter.officeDocumentView(contribution)
    );
  }

  /**
   * Persist a rename initiated from inside the editor (Collabora RenameFile → WOPI
   * → `collaboration-office-document-rename`). The server is the rename authority:
   * `updateCollaboraDocument` updates BOTH the CollaboraDocument profile and the
   * backing file-service document, so the callout title and the editor's filename
   * stay in sync — the same path the in-app header pencil uses.
   *
   * `documentId` is the storage `Document` id (see {@link reportOfficeDocumentWindow}),
   * so we reverse-resolve the domain entity first. Best-effort and tolerant: a
   * bad/stale event is logged and discarded without throwing, so it cannot wedge
   * the consumer. Authorization was already enforced at the WOPI layer (the editor
   * token carries write access), consistent with the other events on this consumer.
   */
  public async officeDocumentRename({
    documentId,
    displayName,
  }: OfficeDocumentRenameInputData): Promise<void> {
    // Never blank a document's name from a malformed event (an empty displayName
    // would collapse the file-service name to just its extension).
    if (!displayName?.trim()) {
      this.logger.warn?.(
        {
          message: 'Ignoring Collabora document rename event with a blank name',
          documentId,
        },
        LogContext.COLLABORATION_INTEGRATION
      );
      return;
    }
    try {
      const collaboraDocument =
        await this.collaboraDocumentService.getCollaboraDocumentByStorageDocumentId(
          documentId
        );
      if (!collaboraDocument) {
        this.logger.warn?.(
          {
            message:
              'Discarding Collabora document rename event: no CollaboraDocument for storage document id',
            documentId,
          },
          LogContext.COLLABORATION_INTEGRATION
        );
        return;
      }

      await this.collaboraDocumentService.updateCollaboraDocument(
        collaboraDocument.id,
        displayName
      );
    } catch (e: any) {
      this.logger.warn?.(
        {
          message: 'Discarding unresolvable Collabora document rename event',
          documentId,
          error: e?.message,
        },
        LogContext.COLLABORATION_INTEGRATION
      );
    }
  }

  /**
   * Shared reverse-resolve-and-report path for the two Collabora window event
   * types (contribution = edited, view = active-but-not-edited).
   *
   * The event's `documentId` is the **storage `Document` id** (=
   * `access_tokens.file_id` = `collaboraDocument.document.id`), NOT the
   * `CollaboraDocument` id — the WOPI token is minted for the storage document
   * (`collabora.document.service.ts`). So we first reverse-resolve the
   * `CollaboraDocument` by its `document.id`, then key the level-zero space /
   * display name resolution off the resolved domain entity and index the record
   * under `CollaboraDocument.id` (consistent with memo `Memo.id` and whiteboard
   * `Whiteboard.id`). Both user arrays pass through verbatim. If no
   * `CollaboraDocument` is backed by that storage id, or any downstream
   * resolution fails (deleted/unknown document), the event is logged and
   * discarded without throwing so a single bad event does not break the consumer.
   * The contribution and view paths differ ONLY in which reporter method `report`
   * they hand the resolved aggregate to.
   */
  private async reportOfficeDocumentWindow(
    {
      documentId,
      writeActors,
      readonlyActors,
    }: OfficeDocumentContributionsInputData,
    kind: 'contribution' | 'view',
    report: (contribution: {
      id: string;
      name: string;
      space: string;
      writeActors: TypedActorSet;
      readonlyActors: TypedActorSet;
      alkemio: boolean;
    }) => void
  ): Promise<void> {
    try {
      // documentId is the storage Document id — reverse-resolve the domain
      // CollaboraDocument that is backed by it.
      const collaboraDocument =
        await this.collaboraDocumentService.getCollaboraDocumentByStorageDocumentId(
          documentId,
          { relations: { profile: true } }
        );
      if (!collaboraDocument) {
        this.logger.warn?.(
          {
            message: `Discarding Collabora document ${kind} event: no CollaboraDocument for storage document id`,
            documentId,
          },
          LogContext.COLLABORATION_INTEGRATION
        );
        return;
      }

      const levelZeroSpaceID =
        await this.communityResolver.getLevelZeroSpaceIdForCollaboraDocument(
          collaboraDocument.id
        );
      const displayName = collaboraDocument.profile?.displayName ?? '';

      // Resolve actor types ONCE for the union of both sets (tolerant batch
      // lookup — unresolvable ids are simply absent and fall to `unknown`),
      // then partition each set by type. The set of ids is unchanged; only their
      // shape changes (flat array → type-keyed object).
      const allIds = [...new Set([...writeActors, ...readonlyActors])];
      const typeById = await this.actorLookupService.getActorTypesByIds(allIds);

      report({
        id: collaboraDocument.id,
        name: displayName,
        space: levelZeroSpaceID,
        writeActors: this.groupActorsByType(writeActors, typeById),
        readonlyActors: this.groupActorsByType(readonlyActors, typeById),
        alkemio: await this.isAlkemioTeamWindow(allIds, typeById),
      });
    } catch (e: any) {
      this.logger.warn?.(
        {
          message: `Discarding unresolvable Collabora document ${kind} event`,
          documentId,
          error: e?.message,
        },
        LogContext.COLLABORATION_INTEGRATION
      );
    }
  }

  /**
   * Partition a flat list of actor ids into a {@link TypedActorSet}: an object
   * keyed by each id's resolved actor type (from `typeById`), falling back to the
   * reserved `unknown` bucket for any id absent from the map. Only non-empty
   * groups appear; an empty input yields `{}`. Ids are de-duplicated so each group
   * holds distinct actor_ids even if the producer repeats one.
   */
  private groupActorsByType(
    ids: string[],
    typeById: Map<string, ActorType>
  ): TypedActorSet {
    const grouped: TypedActorSet = {};
    for (const id of new Set(ids)) {
      const key = typeById.get(id) ?? UNKNOWN_ACTOR_TYPE;
      (grouped[key] ??= []).push(id);
    }
    return grouped;
  }

  /**
   * Compute the aggregate window's `alkemio` team flag from the resolved actor
   * types: `true` only when the window has at least one user actor AND every user
   * actor resolves to an Alkemio-team (`@alkem.io`) email. Any non-team or
   * unresolvable participant drops the whole window to `false`. Never throws: the
   * flag is analytics-only, so a failed lookup degrades to `false` rather than
   * discarding the whole contribution record.
   */
  private async isAlkemioTeamWindow(
    allIds: string[],
    typeById: Map<string, ActorType>
  ): Promise<boolean> {
    const userIds: string[] = [];
    for (const id of allIds) {
      const actorType = typeById.get(id);
      // An id absent from the type resolution is a participant of unknown
      // provenance — it cannot be vouched for as team-internal.
      if (actorType === undefined) {
        return false;
      }
      if (actorType === ActorType.USER) {
        userIds.push(id);
      }
    }
    if (userIds.length === 0) {
      return false;
    }
    try {
      const users = await this.userLookupService.getUsersByIds(userIds, {
        select: { id: true, email: true },
        loadEagerRelations: false,
      });
      // Every user id must resolve to a team email — a missing row (unresolvable
      // user) leaves the counts unequal and correctly reads as non-team.
      return (
        users.length === userIds.length &&
        users.every(user => isAlkemioEmail(user.email))
      );
    } catch (e: any) {
      this.logger.warn?.(
        {
          message:
            'Unable to resolve the Alkemio team flag for a Collabora document window; defaulting to false',
          error: e?.message,
        },
        LogContext.COLLABORATION_INTEGRATION
      );
      return false;
    }
  }
}
