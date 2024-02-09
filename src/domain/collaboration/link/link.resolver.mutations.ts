import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { LinkService } from './link.service';
import { UpdateLinkInput } from '@domain/collaboration/link/dto/link.dto.update';
import { DeleteLinkInput } from '@domain/collaboration/link/dto/link.dto.delete';
import { ILink } from '@domain/collaboration/link/link.interface';
import { CurrentUser, Profiling } from '@common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';
import { StorageBucketUploadFileOnLinkInput } from '@domain/storage/storage-bucket/dto/storage.bucket.dto.upload.file.on.link';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { DocumentService } from '@domain/storage/document/document.service';
import { DocumentAuthorizationService } from '@domain/storage/document/document.service.authorization';

@Resolver()
export class LinkResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private linkService: LinkService,
    private storageBucketService: StorageBucketService,
    private documentService: DocumentService,
    private documentAuthorizationService: DocumentAuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ILink, {
    description: 'Deletes the specified Link.',
  })
  async deleteLink(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteLinkInput
  ): Promise<ILink> {
    const link = await this.linkService.getLinkOrFail(deleteData.ID, {
      relations: { profile: true },
    });
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      link.authorization,
      AuthorizationPrivilege.DELETE,
      `delete link: ${link.id}`
    );
    return await this.linkService.deleteLink(deleteData.ID);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ILink, {
    description: 'Updates the specified Link.',
  })
  async updateLink(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('linkData') linkData: UpdateLinkInput
  ): Promise<ILink> {
    const link = await this.linkService.getLinkOrFail(linkData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      link.authorization,
      AuthorizationPrivilege.UPDATE,
      `update link: ${link.id}`
    );
    return await this.linkService.updateLink(linkData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ILink, {
    description:
      'Create a new Document on the Storage and return the value as part of the returned Link.',
  })
  @Profiling.api
  async uploadFileOnLink(
    @CurrentUser() agentInfo: AgentInfo,
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
      agentInfo,
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
      agentInfo,
      storageBucket.authorization,
      AuthorizationPrivilege.FILE_UPLOAD,
      `create document on storage: ${storageBucket.id}`
    );

    const readStream = createReadStream();

    const document = await this.storageBucketService.uploadFileFromURI(
      link.uri,
      link.id,
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

    const updateData: UpdateLinkInput = {
      ID: link.id,
      uri: this.documentService.getPubliclyAccessibleURL(documentAuthorized),
    };
    return await this.linkService.updateLink(updateData);
  }
}
