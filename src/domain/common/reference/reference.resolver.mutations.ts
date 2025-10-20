import { CurrentUser } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IReference } from '@domain/common/reference/reference.interface';
import { DeleteReferenceInput } from '@domain/common/reference/dto/reference.dto.delete';
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
import { ReadStream } from 'fs';
import { DocumentService } from '@domain/storage/document/document.service';
import { DocumentAuthorizationService } from '@domain/storage/document/document.service.authorization';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class ReferenceResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private referenceService: ReferenceService,
    private storageBucketService: StorageBucketService,
    private documentService: DocumentService,
    private documentAuthorizationService: DocumentAuthorizationService
  ) {}

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

    const updatedReference =
      await this.referenceService.updateReference(referenceData);
    return updatedReference;
  }

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

  @Mutation(() => IReference, {
    description:
      'Create a new Document on the Storage and return the value as part of the returned Reference.',
  })
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

    let document = await this.storageBucketService.uploadFileFromURI(
      reference.uri,
      reference.id,
      storageBucket,
      readStream as unknown as ReadStream,
      filename,
      mimetype,
      agentInfo.userID
    );
    document = await this.documentService.saveDocument(document);

    const documentAuthorizations =
      await this.documentAuthorizationService.applyAuthorizationPolicy(
        document,
        storageBucket.authorization
      );
    await this.authorizationPolicyService.saveAll(documentAuthorizations);

    const updateData: UpdateReferenceInput = {
      ID: reference.id,
      uri: this.documentService.getPubliclyAccessibleURL(document),
    };
    return await this.referenceService.updateReference(updateData);
  }
}
