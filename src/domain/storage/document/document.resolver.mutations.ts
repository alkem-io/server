import { CurrentUser } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { IDocument } from './document.interface';
import { DocumentService } from './document.service';
import { DeleteDocumentInput } from './dto/document.dto.delete';
import { UpdateDocumentInput } from './dto/document.dto.update';

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
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteDocumentInput
  ): Promise<IDocument> {
    const document = await this.documentService.getDocumentOrFail(
      deleteData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
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
    @CurrentUser() agentInfo: AgentInfo,
    @Args('documentData') documentData: UpdateDocumentInput
  ): Promise<IDocument> {
    const document = await this.documentService.getDocumentOrFail(
      documentData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      document.authorization,
      AuthorizationPrivilege.UPDATE,
      `update document: ${document.displayName}`
    );
    return await this.documentService.updateDocument(documentData);
  }
}
