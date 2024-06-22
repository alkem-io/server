import { CurrentUser, Profiling } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { GraphqlGuard } from '@core/authorization';
import { IReference } from '@domain/common/reference/reference.interface';
import { DeleteReferenceInput } from '@domain/common/reference/dto/reference.dto.delete';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ReferenceService } from './reference.service';
import { UpdateReferenceInput } from './dto/reference.dto.update';
import { Reference } from './reference.entity';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { LogContext } from '@common/enums/logging.context';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { StorageBucketUploadFileOnReferenceInput } from '@domain/storage/storage-bucket/dto/storage.bucket.dto.upload.file.on.reference';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { DocumentService } from '@domain/storage/document/document.service';
import { DocumentAuthorizationService } from '@domain/storage/document/document.service.authorization';

@Resolver()
export class ReferenceResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private referenceService: ReferenceService,
    private storageBucketService: StorageBucketService,
    private documentService: DocumentService,
    private documentAuthorizationService: DocumentAuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IReference, {
    description: 'Updates the specified Reference.',
  })
  async updateReference(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('referenceData') referenceData: UpdateReferenceInput
  ): Promise<IReference> {
    const reference = await this.referenceService.getReferenceOrFail(
      referenceData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      reference.authorization,
      AuthorizationPrivilege.UPDATE,
      `update Reference: ${reference.id}`
    );

    const updatedReference = await this.referenceService.updateReference(
      referenceData
    );
    return updatedReference;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IReference, {
    description: 'Deletes the specified Reference.',
  })
  async deleteReference(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteReferenceInput
  ): Promise<IReference> {
    const reference = await this.referenceService.getReferenceOrFail(
      deleteData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      reference.authorization,
      AuthorizationPrivilege.DELETE,
      `delete reference: ${reference.id}`
    );
    return await this.referenceService.deleteReference(deleteData);
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
        relations: {
          profile: {
            storageBucket: {
              authorization: true,
            },
          },
        },
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

    const document = await this.storageBucketService.uploadFileFromURI(
      reference.uri,
      reference.id,
      storageBucket,
      readStream,
      filename,
      mimetype,
      agentInfo.userID
    );

    const documentAuthorized =
      this.documentAuthorizationService.applyAuthorizationPolicy(
        document,
        storageBucket.authorization
      );
    const documentSaved = await this.documentService.saveDocument(
      documentAuthorized
    );

    const updateData: UpdateReferenceInput = {
      ID: reference.id,
      uri: this.documentService.getPubliclyAccessibleURL(documentSaved),
    };
    return await this.referenceService.updateReference(updateData);
  }
}
