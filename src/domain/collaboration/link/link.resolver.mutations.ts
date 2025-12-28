import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { LinkService } from './link.service';
import { UpdateLinkInput } from '@domain/collaboration/link/dto/link.dto.update';
import { DeleteLinkInput } from '@domain/collaboration/link/dto/link.dto.delete';
import { ILink } from '@domain/collaboration/link/link.interface';
import { CurrentUser, Profiling } from '@common/decorators';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ActorContext } from '@core/actor-context';
import { StorageBucketUploadFileOnLinkInput } from '@domain/storage/storage-bucket/dto/storage.bucket.dto.upload.file.on.link';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { DocumentService } from '@domain/storage/document/document.service';
import { DocumentAuthorizationService } from '@domain/storage/document/document.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class LinkResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private linkService: LinkService,
    private storageBucketService: StorageBucketService,
    private documentService: DocumentService,
    private documentAuthorizationService: DocumentAuthorizationService
  ) {}

  @Mutation(() => ILink, {
    description: 'Deletes the specified Link.',
  })
  async deleteLink(
    @CurrentUser() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteLinkInput
  ): Promise<ILink> {
    const link = await this.linkService.getLinkOrFail(deleteData.ID, {
      relations: { profile: true },
    });
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      link.authorization,
      AuthorizationPrivilege.DELETE,
      `delete link: ${link.id}`
    );
    return await this.linkService.deleteLink(deleteData.ID);
  }

  @Mutation(() => ILink, {
    description: 'Updates the specified Link.',
  })
  async updateLink(
    @CurrentUser() actorContext: ActorContext,
    @Args('linkData') linkData: UpdateLinkInput
  ): Promise<ILink> {
    const link = await this.linkService.getLinkOrFail(linkData.ID);
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      link.authorization,
      AuthorizationPrivilege.UPDATE,
      `update link: ${link.id}`
    );
    return await this.linkService.updateLink(linkData);
  }

  @Mutation(() => ILink, {
    description:
      'Create a new Document on the Storage and return the value as part of the returned Link.',
  })
  @Profiling.api
  async uploadFileOnLink(
    @CurrentUser() actorContext: ActorContext,
    @Args('uploadData') uploadData: StorageBucketUploadFileOnLinkInput,
    @Args({ name: 'file', type: () => GraphQLUpload })
    { createReadStream, filename, mimetype }: FileUpload
  ): Promise<ILink> {
    const link = await this.linkService.getLinkOrFail(uploadData.linkID, {
      relations: {
        profile: {
          storageBucket: {
            authorization: true,
          },
        },
      },
    });
    this.authorizationService.grantAccessOrFail(
      actorContext,
      link.authorization,
      AuthorizationPrivilege.UPDATE,
      `link file upload: ${link.id}`
    );

    const profile = link.profile;
    if (!profile || !profile.storageBucket)
      throw new EntityNotInitializedException(
        `Unable to find profile for Link: ${link.id}`,
        LogContext.STORAGE_BUCKET
      );

    const storageBucket = profile.storageBucket;
    this.authorizationService.grantAccessOrFail(
      actorContext,
      storageBucket.authorization,
      AuthorizationPrivilege.FILE_UPLOAD,
      `create document on storage: ${storageBucket.id}`
    );

    const readStream = createReadStream();

    let document = await this.storageBucketService.uploadFileFromURI(
      link.uri,
      link.id,
      storageBucket,
      readStream,
      filename,
      mimetype,
      actorContext.actorId
    );
    document = await this.documentService.saveDocument(document);

    const documentAuthorizations =
      await this.documentAuthorizationService.applyAuthorizationPolicy(
        document,
        storageBucket.authorization
      );
    await this.authorizationPolicyService.saveAll(documentAuthorizations);

    const updateData: UpdateLinkInput = {
      ID: link.id,
      uri: this.documentService.getPubliclyAccessibleURL(document),
    };
    return await this.linkService.updateLink(updateData);
  }
}
