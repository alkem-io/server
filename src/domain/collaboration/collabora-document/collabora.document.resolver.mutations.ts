import { CurrentActor } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { ICollaboraDocument } from './collabora.document.interface';
import { CollaboraDocumentService } from './collabora.document.service';
import { DeleteCollaboraDocumentInput } from './dto/collabora.document.dto.delete';
import { UpdateCollaboraDocumentInput } from './dto/collabora.document.dto.update';

@InstrumentResolver()
@Resolver(() => ICollaboraDocument)
export class CollaboraDocumentResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private collaboraDocumentService: CollaboraDocumentService
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
    // Renaming a CollaboraDocument (the only field this mutation updates today) is
    // permitted on the UPDATE_CONTENT privilege — i.e. anyone who can edit the file
    // content. UPDATE_CONTENT is granted from CONTRIBUTE and is the privilege the WOPI
    // service uses to grant write access in Collabora, so a content editor who can
    // write the document can also rename it. For a framing document, the entity-level
    // UPDATE comes from the callout, so gating rename on UPDATE alone would wrongly
    // exclude content editors who lack callout-edit rights. Managers (UPDATE) are still
    // allowed; if the actor has neither, grantAccessOrFail throws the standard error.
    const authorization = collaboraDocument.authorization;
    const canEditContent =
      !!authorization &&
      this.authorizationService.isAccessGranted(
        actorContext,
        authorization,
        AuthorizationPrivilege.UPDATE_CONTENT
      );
    if (!canEditContent) {
      this.authorizationService.grantAccessOrFail(
        actorContext,
        authorization,
        AuthorizationPrivilege.UPDATE,
        `update CollaboraDocument: ${collaboraDocument.id}`
      );
    }

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
}
