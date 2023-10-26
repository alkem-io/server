import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { StorageBucketService } from './storage.bucket.service';
import { DocumentAuthorizationService } from '../document/document.service.authorization';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { IVisual } from '@domain/common/visual/visual.interface';
import { VisualUploadImageInput } from '@domain/common/visual/dto/visual.dto.upload.image';
import { VisualService } from '@domain/common/visual/visual.service';
import { DocumentService } from '../document/document.service';
import { UpdateVisualInput } from '@domain/common/visual/dto/visual.dto.update';
import { ReferenceService } from '@domain/common/reference/reference.service';
import {
  IReference,
  Reference,
  UpdateReferenceInput,
} from '@domain/common/reference';
import { Visual } from '@domain/common/visual';
import { EntityNotInitializedException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { StorageBucketUploadFileInput } from './dto/storage.bucket.dto.upload.file';
import { StorageBucketUploadFileOnReferenceInput } from './dto/storage.bucket.dto.upload.file.on.reference';
import { IStorageBucket } from './storage.bucket.interface';
import { DeleteStorageBuckeetInput as DeleteStorageBucketInput } from './dto/storage.bucket.dto.delete';

@Resolver()
export class StorageBucketResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private storageBucketService: StorageBucketService,
    private documentAuthorizationService: DocumentAuthorizationService,
    private documentService: DocumentService,
    private visualService: VisualService,
    private referenceService: ReferenceService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IVisual, {
    description: 'Uploads and sets an image for the specified Visual.',
  })
  async uploadImageOnVisual(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('uploadData') uploadData: VisualUploadImageInput,
    @Args({ name: 'file', type: () => GraphQLUpload })
    { createReadStream, filename, mimetype }: FileUpload
  ): Promise<IVisual> {
    const visual = await this.visualService.getVisualOrFail(
      uploadData.visualID,
      {
        relations: [
          'profile',
          'profile.storageBucket',
          'profile.storageBucket.authorization',
        ],
      }
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      visual.authorization,
      AuthorizationPrivilege.UPDATE,
      `visual image upload: ${visual.id}`
    );
    const profile = (visual as Visual).profile;
    if (!profile || !profile.storageBucket)
      throw new EntityNotInitializedException(
        `Unable to find profile or storageBucket for Visual: ${visual.id}`,
        LogContext.STORAGE_BUCKET
      );

    const storageBucket = profile.storageBucket;
    // Also check that the acting agent is allowed to upload
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      storageBucket.authorization,
      AuthorizationPrivilege.FILE_UPLOAD,
      `visual image upload on storage bucket: ${visual.id}`
    );
    const readStream = createReadStream();

    const visualDocument = await this.storageBucketService.uploadImageOnVisual(
      visual,
      storageBucket,
      readStream,
      filename,
      mimetype,
      agentInfo.userID
    );

    // Ensure authorization is updated
    await this.documentAuthorizationService.applyAuthorizationPolicy(
      visualDocument,
      storageBucket.authorization
    );
    const updateData: UpdateVisualInput = {
      visualID: visual.id,
      uri: this.documentService.getPubliclyAccessibleURL(visualDocument),
      alternativeText: uploadData.alternativeText,
    };
    return await this.visualService.updateVisual(updateData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IReference, {
    description:
      'Create a new Document on the Storage and return the value as part of the returned Reference.',
  })
  @Profiling.api
  async uploadFileOnReference(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('uploadData') uploadData: StorageBucketUploadFileOnReferenceInput,
    @Args({ name: 'file', type: () => GraphQLUpload })
    { createReadStream, filename, mimetype }: FileUpload
  ): Promise<IReference> {
    const reference = await this.referenceService.getReferenceOrFail(
      uploadData.referenceID,
      {
        relations: [
          'profile',
          'profile.storageBucket',
          'profile.storageBucket.authorization',
        ],
      }
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      reference.authorization,
      AuthorizationPrivilege.UPDATE,
      `reference file upload: ${reference.id}`
    );

    const profile = (reference as Reference).profile;
    if (!profile || !profile.storageBucket)
      throw new EntityNotInitializedException(
        `Unable to find profile for Reference: ${reference.id}`,
        LogContext.STORAGE_BUCKET
      );

    const storageBucket = profile.storageBucket;
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

    const updateData: UpdateReferenceInput = {
      ID: reference.id,
      uri: this.documentService.getPubliclyAccessibleURL(documentAuthorized),
    };
    return await this.referenceService.updateReference(updateData);
  }

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
