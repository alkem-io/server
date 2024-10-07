import fetch from 'node-fetch';
import { Injectable } from '@nestjs/common';
import { BaseException } from '@common/exceptions/base.exception';
import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { DocumentService } from '@domain/storage/document/document.service';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { DocumentAuthorizationService } from '@domain/storage/document/document.service.authorization';
import { EntityNotInitializedException } from '@common/exceptions';
import { IProfile } from '@domain/common/profile';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { bufferFromUrl } from '@common/utils';
import { randomUUID } from 'crypto';

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
  public async reuploadDocumentToProfileOrFail(
    fileUrl: string,
    profile: IProfile
  ): Promise<string | undefined | never> {
    const storageBucketToCheck = profile.storageBucket;

    if (!storageBucketToCheck) {
      throw new EntityNotInitializedException(
        `Storage bucket not initialized on Profile: '${profile.id}'`,
        LogContext.PROFILE
      );
    }

    if (!this.documentService.isAlkemioDocumentURL(fileUrl)) {
      let imageBuffer: Buffer | undefined;
      try {
        imageBuffer = await bufferFromUrl(fileUrl);
      } catch (e) {
        throw new BaseException(
          'Unable to download image from URL',
          LogContext.COLLABORATION,
          AlkemioErrorStatus.UNSPECIFIED,
          { url: fileUrl }
        );
      }

      // this.storageBucketService.uploadFileAsDocumentFromBuffer(
      //   storageBucketToCheck.id,
      //   imageBuffer,
      //   randomUUID(),
      //   '',
      //   '',
      //   false
      // );
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
      await this.storageBucketService.addDocumentToBucketOrFail(
        storageBucketToCheck.id,
        newDoc
      );
      await this.documentService.saveDocument(newDoc);

      const authorizations =
        this.documentAuthorizationService.applyAuthorizationPolicy(
          newDoc,
          storageBucketToCheck.authorization
        );
      await this.authorizationPolicyService.saveAll(authorizations);
      return this.documentService.getPubliclyAccessibleURL(newDoc);
    }

    return undefined;
  }
}
