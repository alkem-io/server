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
}
