import { Injectable } from '@nestjs/common';
import { BaseException } from '@common/exceptions/base.exception';
import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { DocumentService } from '@domain/storage/document/document.service';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { DocumentAuthorizationService } from '@domain/storage/document/document.service.authorization';
import { EntityNotInitializedException } from '@common/exceptions';
import { IProfile } from '@domain/common/profile';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';

@Injectable()
export class ProfileDocumentsService {
  constructor(
    private documentService: DocumentService,
    private storageBucketService: StorageBucketService,
    private documentAuthorizationService: DocumentAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService
  ) {}

  /***
   * Checks if a document is living under the storage bucket
   * of a profile and adds it if not there
   */
  public async reuploadDocumentToProfile(
    fileUrl: string,
    profile: IProfile
  ): Promise<string | undefined> {
    // if outside Alkemio - skip
    if (!this.documentService.isAlkemioDocumentURL(fileUrl)) {
      return undefined;
    }

    const storageBucketToCheck = profile.storageBucket;

    if (!storageBucketToCheck) {
      throw new EntityNotInitializedException(
        `Storage bucket not initialized on Profile: '${profile.id}'`,
        LogContext.PROFILE
      );
    }

    if (!storageBucketToCheck.documents) {
      throw new EntityNotInitializedException(
        `Documents not initialized on storage bucket: '${storageBucketToCheck.id}'`,
        LogContext.PROFILE
      );
    }

    const docInContent = await this.documentService.getDocumentFromURL(fileUrl);

    if (!docInContent) {
      throw new BaseException(
        `File with URL '${fileUrl}' not found`,
        LogContext.COLLABORATION,
        AlkemioErrorStatus.NOT_FOUND
      );
    }

    const docInThisBucket = storageBucketToCheck.documents.find(
      doc => doc.id === docInContent.id
    );

    if (docInThisBucket) {
      return undefined;
    }

    if (!docInThisBucket) {
      // if not in this bucket - create it inside it
      const newDoc = await this.documentService.createDocument({
        createdBy: docInContent.createdBy,
        displayName: docInContent.displayName,
        externalID: docInContent.externalID,
        mimeType: docInContent.mimeType,
        size: docInContent.size,
        temporaryLocation: false,
      });
      await this.storageBucketService.addDocumentToStorageBucketByIdOrFail(
        storageBucketToCheck.id,
        newDoc
      );
      await this.documentService.saveDocument(newDoc);

      const authorizations =
        await this.documentAuthorizationService.applyAuthorizationPolicy(
          newDoc,
          storageBucketToCheck.authorization
        );
      await this.authorizationPolicyService.saveAll(authorizations);
      return this.documentService.getPubliclyAccessibleURL(newDoc);
    }

    return undefined;
  }
}
