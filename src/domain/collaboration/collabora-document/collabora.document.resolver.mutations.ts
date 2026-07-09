import { CurrentActor } from '@common/decorators';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { streamToBuffer } from '@common/utils/file.util';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { ICollaboraDocument } from './collabora.document.interface';
import { CollaboraDocumentService } from './collabora.document.service';
import { DeleteCollaboraDocumentInput } from './dto/collabora.document.dto.delete';
import { ReplaceCollaboraDocumentInput } from './dto/collabora.document.dto.replace';
import { UpdateCollaboraDocumentInput } from './dto/collabora.document.dto.update';

@InstrumentResolver()
@Resolver(() => ICollaboraDocument)
export class CollaboraDocumentResolverMutations {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger,
    private authorizationService: AuthorizationService,
    private collaboraDocumentService: CollaboraDocumentService,
    private contributionReporter: ContributionReporterService,
    private communityResolverService: CommunityResolverService,
    private readonly configService: ConfigService<AlkemioConfig, true>
  ) {}

  @Mutation(() => ICollaboraDocument, {
    description: 'Updates the specified CollaboraDocument.',
  })
  async updateCollaboraDocument(
    @CurrentActor() actorContext: ActorContext,
    @Args('updateData') updateData: UpdateCollaboraDocumentInput
  ): Promise<ICollaboraDocument> {
    const collaboraDocument =
      await this.collaboraDocumentService.getCollaboraDocumentOrFail(
        updateData.ID
      );
    // Renaming a CollaboraDocument (the only field this mutation updates today) is a
    // content-edit action, so it is gated on UPDATE_CONTENT — not the entity-level
    // UPDATE. UPDATE_CONTENT is granted from CONTRIBUTE and is the privilege the WOPI
    // service uses to grant write access in Collabora, so anyone who can write the file
    // can rename it. For a framing document UPDATE comes from the callout, so gating on
    // UPDATE would wrongly exclude content editors who lack callout-edit rights.
    this.authorizationService.grantAccessOrFail(
      actorContext,
      collaboraDocument.authorization,
      AuthorizationPrivilege.UPDATE_CONTENT,
      `update CollaboraDocument: ${collaboraDocument.id}`
    );

    if (updateData.displayName) {
      return await this.collaboraDocumentService.updateCollaboraDocument(
        updateData.ID,
        updateData.displayName
      );
    }

    return collaboraDocument;
  }

  @Mutation(() => ICollaboraDocument, {
    description: 'Deletes the specified CollaboraDocument.',
  })
  async deleteCollaboraDocument(
    @CurrentActor() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteCollaboraDocumentInput
  ): Promise<ICollaboraDocument> {
    const collaboraDocument =
      await this.collaboraDocumentService.getCollaboraDocumentOrFail(
        deleteData.ID
      );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      collaboraDocument.authorization,
      AuthorizationPrivilege.DELETE,
      `delete CollaboraDocument: ${collaboraDocument.id}`
    );

    return await this.collaboraDocumentService.deleteCollaboraDocument(
      deleteData.ID
    );
  }

  @Mutation(() => ICollaboraDocument, {
    description:
      'Replace the backing file of an existing CollaboraDocument in place, preserving its identity. Requires UPDATE on the document. The replacement must be an allowed OfficeDocs format, within the size cap, and the SAME document type as the current file. Refused while the document is being edited.',
  })
  async replaceCollaboraDocument(
    @CurrentActor() actorContext: ActorContext,
    @Args('replaceData') replaceData: ReplaceCollaboraDocumentInput,
    @Args({ name: 'file', type: () => GraphQLUpload })
    { createReadStream, filename, mimetype }: FileUpload
  ): Promise<ICollaboraDocument> {
    const collaboraDocument =
      await this.collaboraDocumentService.getCollaboraDocumentOrFail(
        replaceData.ID
      );
    // FR-002: re-check UPDATE at mutation time. Replacing the whole backing file
    // is a management action gated on UPDATE — distinct from editing the content
    // or renaming, which are gated on UPDATE_CONTENT (updateCollaboraDocument).
    this.authorizationService.grantAccessOrFail(
      actorContext,
      collaboraDocument.authorization,
      AuthorizationPrivilege.UPDATE,
      `replace CollaboraDocument: ${collaboraDocument.id}`
    );

    // Read the upload to a buffer with a configured timeout so a slow or hung
    // client can't pin Node's heap (mirrors importCollaboraDocument).
    const streamTimeoutMs = this.configService.get<number>(
      'storage.file.stream_timeout_ms',
      { infer: true }
    )!;
    const buffer = await streamToBuffer(createReadStream(), streamTimeoutMs);

    const swapped =
      await this.collaboraDocumentService.replaceCollaboraDocument(
        replaceData.ID,
        buffer,
        filename,
        mimetype,
        actorContext.actorID
      );

    // Persist the title chosen in the replace dialog as the document's display
    // name (feature 016 / FR-009 / FR-015). The swap keeps the same
    // CollaboraDocument entity; reusing the rename path propagates the new name
    // to the editor title bar and the download filename (with the replacement
    // file's extension). Skipped when no title was supplied.
    const updated = replaceData.displayName
      ? await this.collaboraDocumentService.updateCollaboraDocument(
          replaceData.ID,
          replaceData.displayName
        )
      : swapped;

    // FR-014 lifecycle analytics: record the swap as a single-actor
    // COLLABORA_DOCUMENT_REPLACED event. Resolve the level-zero space via the
    // community resolver exactly as the upload path does. Best-effort: the
    // swap is already committed, so a failure here must NOT fail the mutation
    // (a retry would double-swap). Catch and log; never re-throw.
    try {
      const community =
        await this.communityResolverService.getCommunityForCollaboraDocumentOrFail(
          updated.id
        );
      const levelZeroSpaceID =
        await this.communityResolverService.getLevelZeroSpaceIdForCommunity(
          community.id
        );
      this.contributionReporter.calloutCollaboraDocumentReplaced(
        {
          id: updated.id,
          name: updated.profile?.displayName ?? updated.id,
          space: levelZeroSpaceID,
        },
        actorContext
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const details = e instanceof Error ? e.stack : String(e);
      this.logger.error(
        `Failed to report COLLABORA_DOCUMENT_REPLACED analytics for CollaboraDocument ${updated.id}: ${message}`,
        details,
        LogContext.COLLABORATION
      );
    }

    return updated;
  }
}
