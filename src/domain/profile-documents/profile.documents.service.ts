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
import { detectBufferMime } from 'mime-detect';
import { randomUUID } from 'crypto';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';

@Injectable()
export class ProfileDocumentsService {
  constructor(
    private documentService: DocumentService,
    private storageBucketService: StorageBucketService,
    private documentAuthorizationService: DocumentAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService
  ) {}

  private async uploadDocumentFromAlkemioOrFail(
    url: string,
    storageBucket: IStorageBucket
  ) {
    // find the document by URL
    const docInAlkemio = await this.documentService.getDocumentFromURL(url);

    if (!docInAlkemio) {
      throw new BaseException(
        `File with URL '${url}' not found in Alkemio`,
        LogContext.COLLABORATION,
        AlkemioErrorStatus.NOT_FOUND,
        { url }
      );
    }
    // is the document in this bucket?
    const docInThisBucket = storageBucket.documents.find(
      doc => doc.id === docInAlkemio.id
    );
    // if in this bucket - skip
    if (docInThisBucket) {
      return undefined;
    }
    // if NOT in this bucket - create it inside it
    const newDocument = await this.documentService.createDocument({
      createdBy: '',
      displayName: docInAlkemio.displayName,
      externalID: docInAlkemio.externalID,
      mimeType: docInAlkemio.mimeType,
      size: docInAlkemio.size,
      temporaryLocation: false,
    });

    await this.storageBucketService.addDocumentToBucketOrFail(
      storageBucket.id,
      newDocument
    );
    return this.documentService.saveDocument(newDocument);
  }

  private async uploadFileFromUrlOrFail(url: string, storageBucketId: string) {
    let imageBuffer: Buffer | undefined;
    try {
      imageBuffer = await bufferFromUrl(url);
    } catch (e) {
      throw new BaseException(
        'Unable to download image from URL',
        LogContext.COLLABORATION,
        AlkemioErrorStatus.UNSPECIFIED,
        { url, originalException: e }
      );
    }

    let mimeType: string | undefined;
    try {
      mimeType = await detectBufferMime(imageBuffer);
    } catch (e) {
      throw new BaseException(
        'Unable to detect file mime type',
        LogContext.COLLABORATION,
        AlkemioErrorStatus.UNSPECIFIED,
        { url, originalException: e }
      );
    }

    return this.storageBucketService.uploadFileAsDocumentFromBuffer(
      storageBucketId,
      imageBuffer,
      randomUUID(),
      mimeType,
      '',
      false
    );
  }

  /***
   * Checks if a document is living under the storage bucket of a profile and adds it if not there
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

    if (!storageBucketToCheck.documents) {
      throw new EntityNotInitializedException(
        `Documents not initialized on storage bucket: '${storageBucketToCheck.id}'`,
        LogContext.PROFILE
      );
    }
    const isAlkemioUrl = this.documentService.isAlkemioDocumentURL(fileUrl);

    const newDocument = await (isAlkemioUrl
      ? this.uploadDocumentFromAlkemioOrFail(fileUrl, storageBucketToCheck)
      : this.uploadFileFromUrlOrFail(fileUrl, storageBucketToCheck.id));
    // no new document was generated
    if (!newDocument) {
      return undefined;
    }

    const authorizations =
      this.documentAuthorizationService.applyAuthorizationPolicy(
        newDocument,
        storageBucketToCheck.authorization
      );
    await this.authorizationPolicyService.saveAll(authorizations);

    return this.documentService.getPubliclyAccessibleURL(newDocument);
  }
}
