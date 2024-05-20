import { CurrentUser } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { VisualService } from './visual.service';
import { IVisual } from './visual.interface';
import { UpdateVisualInput } from './dto/visual.dto.update';
import { VisualUploadImageInput } from './dto/visual.dto.upload.image';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { Visual } from './visual.entity';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { LogContext } from '@common/enums/logging.context';
import { DocumentService } from '@domain/storage/document/document.service';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { DocumentAuthorizationService } from '@domain/storage/document/document.service.authorization';

@Resolver()
export class VisualResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private visualService: VisualService,
    private documentService: DocumentService,
    private storageBucketService: StorageBucketService,
    private documentAuthorizationService: DocumentAuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IVisual, {
    description: 'Updates the image URI for the specified Visual.',
  })
  async updateVisual(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('updateData') updateData: UpdateVisualInput
  ): Promise<IVisual> {
    const visual = await this.visualService.getVisualOrFail(
      updateData.visualID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      visual.authorization,
      AuthorizationPrivilege.UPDATE,
      `visual image update: ${visual.id}`
    );
    return await this.visualService.updateVisual(updateData);
  }

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

    const visualDocument = await this.visualService.uploadImageOnVisual(
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
}
