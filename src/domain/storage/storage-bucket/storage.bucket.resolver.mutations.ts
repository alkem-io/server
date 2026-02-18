import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor, Profiling } from '@src/common/decorators';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { DocumentService } from '../document/document.service';
import { DocumentAuthorizationService } from '../document/document.service.authorization';
import { DeleteStorageBuckeetInput as DeleteStorageBucketInput } from './dto/storage.bucket.dto.delete';
import { StorageBucketUploadFileInput } from './dto/storage.bucket.dto.upload.file';
import { StorageBucketUploadFileResult } from './dto/storage.bucket.dto.upload.file.result';
import { IStorageBucket } from './storage.bucket.interface';
import { StorageBucketService } from './storage.bucket.service';

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

  @Mutation(() => StorageBucketUploadFileResult, {
    description:
      'Create a new Document on the Storage and return the ID and public URL.',
  })
  @Profiling.api
  async uploadFileOnStorageBucket(
    @CurrentActor() actorContext: ActorContext,
    @Args('uploadData') uploadData: StorageBucketUploadFileInput,
    @Args({ name: 'file', type: () => GraphQLUpload })
    { createReadStream, filename, mimetype }: FileUpload
  ): Promise<StorageBucketUploadFileResult> {
    const storageBucket =
      await this.storageBucketService.getStorageBucketOrFail(
        uploadData.storageBucketId
      );

    this.authorizationService.grantAccessOrFail(
      actorContext,
      storageBucket.authorization,
      AuthorizationPrivilege.FILE_UPLOAD,
      `create document on storage: ${storageBucket.id}`
    );

    const readStream = createReadStream();

    let document = await this.storageBucketService.uploadFileAsDocument(
      storageBucket.id,
      readStream,
      filename,
      mimetype,
      actorContext.actorId,
      uploadData.temporaryLocation
    );
    document = await this.documentService.saveDocument(document);

    const documentAuthorizations =
      await this.documentAuthorizationService.applyAuthorizationPolicy(
        document,
        storageBucket.authorization
      );
    await this.authorizationPolicyService.saveAll(documentAuthorizations);

    return {
      id: document.id,
      url: this.documentService.getPubliclyAccessibleURL(document),
    };
  }

  @Mutation(() => IStorageBucket, {
    description: 'Deletes a Storage Bucket',
  })
  @Profiling.api
  async deleteStorageBucket(
    @CurrentActor() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteStorageBucketInput
  ): Promise<IStorageBucket> {
    const storageBucket =
      await this.storageBucketService.getStorageBucketOrFail(deleteData.ID);

    this.authorizationService.grantAccessOrFail(
      actorContext,
      storageBucket.authorization,
      AuthorizationPrivilege.DELETE,
      `Delete storage bucket: ${storageBucket.id}`
    );
    return await this.storageBucketService.deleteStorageBucket(deleteData.ID);
  }
}
