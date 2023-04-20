import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { StorageSpaceService } from './storage.space.service';
import { DocumentAuthorizationService } from '../document/document.service.authorization';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { StorageSpaceResolverService } from '@services/infrastructure/entity-resolver/storage.space.resolver.service';
import { IVisual } from '@domain/common/visual/visual.interface';
import { VisualUploadImageInput } from '@domain/common/visual/dto/visual.dto.upload.image';
import { VisualService } from '@domain/common/visual/visual.service';
import { DocumentService } from '../document/document.service';
import { UpdateVisualInput } from '@domain/common/visual/dto/visual.dto.update';
import { ReferenceService } from '@domain/common/reference/reference.service';
import { IReference, UpdateReferenceInput } from '@domain/common/reference';

@Resolver()
export class StorageSpaceResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private storageSpaceService: StorageSpaceService,
    private documentAuthorizationService: DocumentAuthorizationService,
    private storageSpaceResolverService: StorageSpaceResolverService,
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
      uploadData.visualID
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      visual.authorization,
      AuthorizationPrivilege.UPDATE,
      `visual image upload: ${visual.id}`
    );
    // Also check that the acting agent is allowed to upload
    const storageSpaceId =
      await this.storageSpaceResolverService.getStorageSpaceIdForVisual(
        visual.id
      );
    const storageSpace = await this.storageSpaceService.getStorageSpaceOrFail(
      storageSpaceId
    );
    // this.authorizationService.grantAccessOrFail(
    //   agentInfo,
    //   storageSpace.authorization,
    //   AuthorizationPrivilege.FILE_UPLOAD,
    //   `visual image upload on storage space: ${visual.id}`
    // );
    const readStream = createReadStream();
    const visualDocument = await this.storageSpaceService.uploadImageOnVisual(
      visual,
      storageSpace,
      readStream,
      filename,
      mimetype,
      agentInfo.userID
    );

    // Ensure authorization is updated
    await this.documentAuthorizationService.applyAuthorizationPolicy(
      visualDocument,
      storageSpace.authorization
    );
    const updateData: UpdateVisualInput = {
      visualID: visual.id,
      uri: this.documentService.getPubliclyAccessibleURL(visualDocument),
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
    @Args('uploadData') uploadData: VisualUploadImageInput,
    @Args({ name: 'file', type: () => GraphQLUpload })
    { createReadStream, filename, mimetype }: FileUpload
  ): Promise<IReference> {
    const reference = await this.referenceService.getReferenceOrFail(
      uploadData.visualID
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      reference.authorization,
      AuthorizationPrivilege.UPDATE,
      `reference file upload: ${reference.id}`
    );
    // Todo: this needs to pick up the right storage space based on the Profile for a Reference
    // To test out the functionality it is using the contributors one for now
    const storageId = ''; // TODO TODO
    const storageSpace = await this.storageSpaceService.getStorageSpaceOrFail(
      storageId
    );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      storageSpace.authorization,
      AuthorizationPrivilege.READ, //FILE_UPLOAD,
      `create document on storage: ${storageSpace.id}`
    );

    const readStream = createReadStream();

    const document = await this.storageSpaceService.uploadFileAsDocument(
      storageSpace,
      readStream,
      filename,
      mimetype,
      agentInfo.userID
    );

    const documentAuthorized =
      await this.documentAuthorizationService.applyAuthorizationPolicy(
        document,
        storageSpace.authorization
      );

    const updateData: UpdateReferenceInput = {
      ID: reference.id,
      uri: this.documentService.getPubliclyAccessibleURL(documentAuthorized),
    };
    return await this.referenceService.updateReference(updateData);
  }
}
