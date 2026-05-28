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
    this.authorizationService.grantAccessOrFail(
      actorContext,
      collaboraDocument.authorization,
      AuthorizationPrivilege.UPDATE,
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
