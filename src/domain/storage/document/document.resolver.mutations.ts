import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { DocumentService } from './document.service';
import { CurrentUser } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ActorContext } from '@core/actor-context';
import { IDocument } from './document.interface';
import { DeleteDocumentInput } from './dto/document.dto.delete';
import { UpdateDocumentInput } from './dto/document.dto.update';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class DocumentResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private documentService: DocumentService
  ) {}

  @Mutation(() => IDocument, {
    description: 'Deletes the specified Document.',
  })
  async deleteDocument(
    @CurrentUser() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteDocumentInput
  ): Promise<IDocument> {
    const document = await this.documentService.getDocumentOrFail(
      deleteData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      document.authorization,
      AuthorizationPrivilege.DELETE,
      `delete document: ${document.displayName}`
    );

    return await this.documentService.deleteDocument(deleteData);
  }

  @Mutation(() => IDocument, {
    description: 'Updates the specified Document.',
  })
  async updateDocument(
    @CurrentUser() actorContext: ActorContext,
    @Args('documentData') documentData: UpdateDocumentInput
  ): Promise<IDocument> {
    const document = await this.documentService.getDocumentOrFail(
      documentData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      document.authorization,
      AuthorizationPrivilege.UPDATE,
      `update document: ${document.displayName}`
    );
    return await this.documentService.updateDocument(documentData);
  }
}
