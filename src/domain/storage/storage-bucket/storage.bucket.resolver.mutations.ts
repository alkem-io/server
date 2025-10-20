import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
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
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { ReadStream } from 'fs';

@InstrumentResolver()
@Resolver()
export class StorageBucketResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private storageBucketService: StorageBucketService,
    private documentAuthorizationService: DocumentAuthorizationService,
    private documentService: DocumentService
  ) {}

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

    let document = await this.storageBucketService.uploadFileAsDocument(
      storageBucket.id,
      readStream as unknown as ReadStream,
      filename,
      mimetype,
      agentInfo.userID,
      uploadData.temporaryLocation
    );
    document = await this.documentService.saveDocument(document);

    const documentAuthorizations =
      await this.documentAuthorizationService.applyAuthorizationPolicy(
        document,
        storageBucket.authorization
      );
    await this.authorizationPolicyService.saveAll(documentAuthorizations);

    return this.documentService.getPubliclyAccessibleURL(document);
  }

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
