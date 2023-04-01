import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { StorageSpaceService } from './storage.space.service';
import { IDocument } from '../document/document.interface';
import { DocumentAuthorizationService } from '../document/document.service.authorization';
import { CreateDocumentOnStorageSpaceInput } from './dto/storage.space.dto.create.document';

@Resolver()
export class StorageSpaceResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private storageService: StorageSpaceService,
    private documentAuthorizationService: DocumentAuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IDocument, {
    description: 'Create a new Document on the Storage.',
  })
  @Profiling.api
  async createDocumentOnStorageSpace(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('documentData') documentData: CreateDocumentOnStorageSpaceInput
  ): Promise<IDocument> {
    const storage = await this.storageService.getStorageSpaceOrFail(
      documentData.storageID
    );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      storage.authorization,
      AuthorizationPrivilege.CREATE,
      `create document on storage: ${storage.id}`
    );

    const document = await this.storageService.createDocument(
      documentData,
      agentInfo.userID
    );

    const documentAuthorized =
      await this.documentAuthorizationService.applyAuthorizationPolicy(
        document,
        storage.authorization
      );
    return documentAuthorized;
  }
}
