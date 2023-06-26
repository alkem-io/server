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
import { StorageBucketResolverService } from '@services/infrastructure/entity-resolver/storage.bucket.resolver.service';
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

@Resolver()
export class StorageBucketResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private storageBucketService: StorageBucketService,
    private documentAuthorizationService: DocumentAuthorizationService,
    private storageBucketResolverService: StorageBucketResolverService,
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
        relations: ['profile'],
      }
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      visual.authorization,
      AuthorizationPrivilege.UPDATE,
      `visual image upload: ${visual.id}`
    );
    const profile = (visual as Visual).profile;
    if (!profile)
      throw new EntityNotInitializedException(
        `Unable to find profile for Visual: ${visual.id}`,
        LogContext.STORAGE_BUCKET
      );
    const storageBucketId =
      await this.storageBucketResolverService.getStorageBucketIdForProfile(
        profile.id
      );
    const storageBucket =
      await this.storageBucketService.getStorageBucketOrFail(storageBucketId);
    // Also check that the acting agent is allowed to upload
    // this.authorizationService.grantAccessOrFail(
    //   agentInfo,
    //   storageBucket.authorization,
    //   AuthorizationPrivilege.FILE_UPLOAD,
    //   `visual image upload on storage space: ${visual.id}`
    // );
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
    @Args('uploadData') uploadData: StorageBucketUploadFileInput,
    @Args({ name: 'file', type: () => GraphQLUpload })
    { createReadStream, filename, mimetype }: FileUpload
  ): Promise<IReference> {
    const reference = await this.referenceService.getReferenceOrFail(
      uploadData.referenceID,
      {
        relations: ['profile'],
      }
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      reference.authorization,
      AuthorizationPrivilege.UPDATE,
      `reference file upload: ${reference.id}`
    );

    const profile = (reference as Reference).profile;
    if (!profile)
      throw new EntityNotInitializedException(
        `Unable to find profile for Reference: ${reference.id}`,
        LogContext.STORAGE_BUCKET
      );

    const storageBucketId =
      await this.storageBucketResolverService.getStorageBucketIdForProfile(
        profile.id
      );
    const storageBucket =
      await this.storageBucketService.getStorageBucketOrFail(storageBucketId);

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      storageBucket.authorization,
      AuthorizationPrivilege.READ, //FILE_UPLOAD,
      `create document on storage: ${storageBucket.id}`
    );

    const readStream = createReadStream();

    const document = await this.storageBucketService.uploadFileAsDocument(
      storageBucket,
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
}
