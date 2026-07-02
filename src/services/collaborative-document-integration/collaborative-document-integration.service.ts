import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { ActorType } from '@common/enums/actor.type';
import { EntityNotFoundException } from '@common/exceptions';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { CollaboraDocumentService } from '@domain/collaboration/collabora-document/collabora.document.service';
import { MemoService } from '@domain/common/memo';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MemoContributionsInputData } from '@services/collaborative-document-integration/inputs/memo.contributions.input.data';
import { OfficeDocumentContributionsInputData } from '@services/collaborative-document-integration/inputs/office.document.contributions.input.data';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import {
  TypedActorSet,
  UNKNOWN_ACTOR_TYPE,
} from '@services/external/elasticsearch/types/typed.actor.set';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { FetchInputData, InfoInputData, SaveInputData } from './inputs';
import {
  FetchContentData,
  FetchErrorData,
  FetchOutputData,
  InfoOutputData,
  SaveContentData,
  SaveErrorData,
  SaveOutputData,
} from './outputs';
import { FetchErrorCodes, SaveErrorCodes } from './types';

type AccessGrantedInputData = {
  userId: string;
  documentId: string;
  privilege: AuthorizationPrivilege;
};

@Injectable()
export class CollaborativeDocumentIntegrationService {
  private readonly maxCollaboratorsInRoom: number;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: WinstonLogger,
    private readonly authorizationService: AuthorizationService,
    private readonly actorContextService: ActorContextService,
    private readonly memoService: MemoService,
    private readonly collaboraDocumentService: CollaboraDocumentService,
    private readonly configService: ConfigService<AlkemioConfig, true>,
    private readonly contributionReporter: ContributionReporterService,
    private readonly communityResolver: CommunityResolverService,
    private readonly actorLookupService: ActorLookupService
  ) {
    this.maxCollaboratorsInRoom = this.configService.get(
      'collaboration.memo.max_collaborators_in_room',
      { infer: true }
    );
  }

  public async accessGranted(data: AccessGrantedInputData): Promise<boolean> {
    try {
      const memo = await this.memoService.getMemoOrFail(data.documentId);
      const actorContext = await this.actorContextService.resolveActorContext(
        data.userId
      );

      return this.authorizationService.isAccessGranted(
        actorContext,
        memo.authorization,
        data.privilege
      );
    } catch (e: any) {
      this.logger.error(
        e?.message,
        e?.stack,
        LogContext.COLLAB_DOCUMENT_INTEGRATION
      );
      return false;
    }
  }

  public async info({
    userId,
    documentId,
  }: InfoInputData): Promise<InfoOutputData> {
    const read = await this.accessGranted({
      userId,
      documentId,
      privilege: AuthorizationPrivilege.READ,
    });

    if (!read) {
      return {
        read: false,
        update: false,
        isMultiUser: false,
        maxCollaborators: 0,
      };
    }

    const update = await this.accessGranted({
      userId,
      documentId,
      privilege: AuthorizationPrivilege.UPDATE_CONTENT,
    });

    const isMultiUser = await this.memoService.isMultiUser(documentId);

    const maxCollaborators = isMultiUser ? this.maxCollaboratorsInRoom : 1;

    return { read, update, isMultiUser, maxCollaborators };
  }

  public async save({
    documentId,
    binaryStateInBase64,
  }: SaveInputData): Promise<SaveOutputData> {
    const binaryState = Buffer.from(binaryStateInBase64, 'base64');
    // try saving
    try {
      await this.memoService.saveContent(documentId, binaryState);
    } catch (e: any) {
      const message = e?.message ?? JSON.stringify(e);
      this.logger.error(
        message,
        e?.stack,
        LogContext.COLLAB_DOCUMENT_INTEGRATION
      );
      const code = convertExceptionToSaveErrorCode(e);
      return new SaveOutputData(new SaveErrorData(message, code));
    }
    // return success on successful save
    return new SaveOutputData(new SaveContentData());
  }

  public async fetch(data: FetchInputData): Promise<FetchOutputData> {
    try {
      const memo = await this.memoService.getMemoOrFail(data.documentId, {
        loadEagerRelations: false,
        select: { id: true, content: true },
      });

      const contentBase64 =
        memo.content != undefined ? memo.content.toString('base64') : undefined;

      return new FetchOutputData(new FetchContentData(contentBase64));
    } catch (e: any) {
      this.logger.error(
        e?.message,
        e?.stack,
        LogContext.COLLAB_DOCUMENT_INTEGRATION
      );

      const code = convertExceptionToFetchErrorCode(e);

      return new FetchOutputData(
        new FetchErrorData(
          'An error occurred while fetching the content.',
          code
        )
      );
    }
  }

  public async memoContributions({
    memoId,
    users,
  }: MemoContributionsInputData): Promise<void> {
    const community =
      await this.communityResolver.getCommunityForMemoOrFail(memoId);
    const levelZeroSpaceID =
      await this.communityResolver.getLevelZeroSpaceIdForCommunity(
        community.id
      );
    const { displayName } = await this.memoService.getProfile(memoId);

    users.forEach(({ id }) => {
      this.contributionReporter.memoContribution(
        {
          id: memoId,
          name: displayName,
          space: levelZeroSpaceID,
        },
        {
          actorID: id,
        }
      );
    });
  }

  /**
   * Consumes a Collabora document contribution event and indexes ONE aggregate
   * contribution record per (document, window).
   *
   * The event's `documentId` is the **storage `Document` id** (=
   * `access_tokens.file_id` = `collaboraDocument.document.id`), NOT the
   * `CollaboraDocument` id — the WOPI token is minted for the storage document
   * (`collabora.document.service.ts`). So we first reverse-resolve the
   * `CollaboraDocument` by its `document.id`, then key the community /
   * level-zero space / display name resolution off the resolved domain entity
   * and index the record under `CollaboraDocument.id` (consistent with memo
   * `Memo.id` and whiteboard `Whiteboard.id`). Both user arrays pass through
   * verbatim. If no `CollaboraDocument` is backed by that storage id, or any
   * downstream resolution fails (deleted/unknown document), the event is logged
   * and discarded without throwing (FR-008) so a single bad event does not
   * break the consumer.
   */
  public async officeDocumentContributions(
    data: OfficeDocumentContributionsInputData
  ): Promise<void> {
    await this.reportOfficeDocumentWindow(data, 'contribution', contribution =>
      this.contributionReporter.officeDocumentContribution(contribution)
    );
  }

  /**
   * Companion of {@link officeDocumentContributions} (FR-012): consumes a
   * Collabora document **view** event — a window in which the document was
   * active but not genuinely modified — and indexes ONE aggregate VIEW record
   * per (document, window). Same reverse-resolution path; differs ONLY in the
   * reporter method invoked. Per (document, window) the producer emits either
   * the contribution event or the view event, never both.
   */
  public async officeDocumentViews(
    data: OfficeDocumentContributionsInputData
  ): Promise<void> {
    await this.reportOfficeDocumentWindow(data, 'view', contribution =>
      this.contributionReporter.officeDocumentView(contribution)
    );
  }

  /**
   * Shared reverse-resolve-and-report path for the two Collabora window event
   * types (contribution = edited, view = active-but-not-edited).
   *
   * The event's `documentId` is the **storage `Document` id** (=
   * `access_tokens.file_id` = `collaboraDocument.document.id`), NOT the
   * `CollaboraDocument` id — the WOPI token is minted for the storage document
   * (`collabora.document.service.ts`). So we first reverse-resolve the
   * `CollaboraDocument` by its `document.id`, then key the community /
   * level-zero space / display name resolution off the resolved domain entity
   * and index the record under `CollaboraDocument.id` (consistent with memo
   * `Memo.id` and whiteboard `Whiteboard.id`). Both user arrays pass through
   * verbatim. If no `CollaboraDocument` is backed by that storage id, or any
   * downstream resolution fails (deleted/unknown document), the event is logged
   * and discarded without throwing (FR-008) so a single bad event does not
   * break the consumer. The contribution and view paths differ ONLY in which
   * reporter method `report` they hand the resolved aggregate to.
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
          LogContext.COLLAB_DOCUMENT_INTEGRATION
        );
        return;
      }

      const community =
        await this.communityResolver.getCommunityForCollaboraDocumentOrFail(
          collaboraDocument.id
        );
      const levelZeroSpaceID =
        await this.communityResolver.getLevelZeroSpaceIdForCommunity(
          community.id
        );
      const displayName = collaboraDocument.profile?.displayName ?? '';

      // Resolve actor types ONCE for the union of both sets (tolerant batch
      // lookup — unresolvable ids are simply absent and fall to `unknown`),
      // then partition each set by type. The set of ids is unchanged (SC-006);
      // only their shape changes (flat array → type-keyed object).
      const allIds = [...new Set([...writeActors, ...readonlyActors])];
      const typeById = await this.actorLookupService.getActorTypesByIds(allIds);

      report({
        id: collaboraDocument.id,
        name: displayName,
        space: levelZeroSpaceID,
        writeActors: this.groupActorsByType(writeActors, typeById),
        readonlyActors: this.groupActorsByType(readonlyActors, typeById),
      });
    } catch (e: any) {
      this.logger.warn?.(
        {
          message: `Discarding unresolvable Collabora document ${kind} event`,
          documentId,
          error: e?.message,
        },
        LogContext.COLLAB_DOCUMENT_INTEGRATION
      );
    }
  }

  /**
   * Partition a flat list of actor ids into a {@link TypedActorSet}: an object
   * keyed by each id's resolved {@link ActorType} (from `typeById`), falling
   * back to the reserved `unknown` bucket for any id absent from the map
   * (FR-005). Only non-empty groups appear; an empty input yields `{}`
   * (FR-003). Ids are de-duplicated so each group holds distinct actor_ids
   * (matches the record-shape contract) even if the producer repeats one.
   * Ordering within a group is unspecified (FR-002) — this folds in encounter
   * order, but callers must not rely on it. See feature 012-collabora-actor-type
   * (in the agents-hq workspace repo).
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
}

const convertExceptionToFetchErrorCode = (
  exception: Error
): FetchErrorCodes => {
  const defaultCode = FetchErrorCodes.INTERNAL_ERROR;
  if (exception instanceof EntityNotFoundException) {
    return FetchErrorCodes.NOT_FOUND;
  }

  return defaultCode;
};

const convertExceptionToSaveErrorCode = (exception: Error): SaveErrorCodes => {
  const defaultCode = SaveErrorCodes.INTERNAL_ERROR;
  if (exception instanceof EntityNotFoundException) {
    return SaveErrorCodes.NOT_FOUND;
  }

  return defaultCode;
};
