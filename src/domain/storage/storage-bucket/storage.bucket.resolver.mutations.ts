import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { StorageBucketService } from './storage.bucket.service';
import { DocumentAuthorizationService } from '../document/document.service.authorization';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { DocumentService } from '../document/document.service';
import { StorageBucketUploadFileInput } from './dto/storage.bucket.dto.upload.file';
import { IStorageBucket } from './storage.bucket.interface';
import { DeleteStorageBuckeetInput as DeleteStorageBucketInput } from './dto/storage.bucket.dto.delete';

@Resolver()
export class StorageBucketResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private storageBucketService: StorageBucketService,
    private documentAuthorizationService: DocumentAuthorizationService,
    private documentService: DocumentService
  ) {}
  @UseGuards(GraphqlGuard)
  @Mutation(() => String, {
    description:
      'Create a new Document on the Storage and return the public Url.',
  })
  @Profiling.api
  async uploadFileOnStorageBucket(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('uploadData') uploadData: StorageBucketUploadFileInput,
    @Args({ name: 'file', type: () => GraphQLUpload })
    { createReadStream, filename, mimetype }: FileUpload
  ): Promise<string> {
    const storageBucket =
      await this.storageBucketService.getStorageBucketOrFail(
        uploadData.storageBucketId
      );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      storageBucket.authorization,
      AuthorizationPrivilege.FILE_UPLOAD,
      `create document on storage: ${storageBucket.id}`
    );

    const readStream = createReadStream();

    const document = await this.storageBucketService.uploadFileAsDocument(
      storageBucket.id,
      readStream,
      filename,
      mimetype,
      agentInfo.userID
    );

    const documentAuthorized =
      await this.documentAuthorizationService.applyAuthorizationPolicy(
        document,
        storageBucket.authorization
      );

    return this.documentService.getPubliclyAccessibleURL(documentAuthorized);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IStorageBucket, {
    description: 'Deletes a Storage Bucket',
  })
  @Profiling.api
  async deleteStorageBucket(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteStorageBucketInput
  ): Promise<IStorageBucket> {
    const storageBucket =
      await this.storageBucketService.getStorageBucketOrFail(deleteData.ID);

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      storageBucket.authorization,
      AuthorizationPrivilege.DELETE,
      `Delete storage bucket: ${storageBucket.id}`
    );
    return await this.storageBucketService.deleteStorageBucket(deleteData.ID);
  }
}
