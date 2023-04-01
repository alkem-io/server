import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { DocumentService } from './document.service';
import { CurrentUser } from '@common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';
import { IDocument } from './document.interface';
import { DeleteDocumentInput } from './dto/documentdto.delete';
import { UpdateDocumentInput } from './dto/document.dto.update';

@Resolver()
export class DocumentResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private documentService: DocumentService
  ) {}

  @UseGuards(GraphqlGuard)
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
      `delete document: ${document.nameID}`
    );
    return await this.documentService.deleteDocument(deleteData);
  }

  @UseGuards(GraphqlGuard)
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
      `update document: ${document.nameID}`
    );
    return await this.documentService.updateDocument(documentData);
  }
}
