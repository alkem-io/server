import { CurrentUser } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
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
import { DocumentAuthorizationService } from '@domain/storage/document/document.service.authorization';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class VisualResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private visualService: VisualService,
    private documentService: DocumentService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private documentAuthorizationService: DocumentAuthorizationService
  ) {}

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
            storageBucket: true,
          },
          mediaGallery: {
            profile: {
              storageBucket: true,
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
    const profile =
      (visual as Visual).profile ?? (visual as Visual).mediaGallery?.profile;
    if (!profile || !profile.storageBucket)
      throw new EntityNotInitializedException(
        `Unable to find profile or storageBucket for Visual: ${visual.id}`,
        LogContext.STORAGE_BUCKET
      );

    const storageBucket = profile.storageBucket;
    const storageBucketAuthorization = storageBucket.authorization;

    if (!storageBucketAuthorization) {
      throw new EntityNotInitializedException(
        `Authorization not initialized on storage bucket: ${storageBucket.id}`,
        LogContext.STORAGE_BUCKET
      );
    }

    const hasCredentialRules = Boolean(
      storageBucketAuthorization?.credentialRules?.length
    );

    if (hasCredentialRules) {
      this.authorizationService.grantAccessOrFail(
        agentInfo,
        storageBucketAuthorization,
        AuthorizationPrivilege.FILE_UPLOAD,
        `visual image upload on storage bucket: ${visual.id}`
      );
    } else {
      const fallbackAuthorization =
        (visual as Visual).mediaGallery?.authorization ??
        profile.authorization ??
        visual.authorization;

      if (!fallbackAuthorization) {
        throw new EntityNotInitializedException(
          `Unable to determine authorization policy for visual upload: ${visual.id}`,
          LogContext.STORAGE_BUCKET
        );
      }

      this.authorizationService.grantAccessOrFail(
        agentInfo,
        fallbackAuthorization,
        AuthorizationPrivilege.UPDATE,
        `visual image upload via fallback authorization: ${visual.id}`
      );
    }
    const readStream = createReadStream();

    const visualDocument = await this.visualService.uploadImageOnVisual(
      visual,
      storageBucket,
      readStream,
      filename,
      mimetype,
      agentInfo.userID
    );

    await this.documentService.saveDocument(visualDocument);
    // Ensure authorization is updated
    const documentAuthorizations =
      await this.documentAuthorizationService.applyAuthorizationPolicy(
        visualDocument,
        storageBucket.authorization
      );
    await this.authorizationPolicyService.saveAll(documentAuthorizations);

    const updateData: UpdateVisualInput = {
      visualID: visual.id,
      uri: this.documentService.getPubliclyAccessibleURL(visualDocument),
      alternativeText: uploadData.alternativeText,
    };
    return await this.visualService.updateVisual(updateData);
  }
}
