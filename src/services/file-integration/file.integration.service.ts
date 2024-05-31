import { Inject, Injectable } from '@nestjs/common';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { StorageService } from '@services/adapters/storage';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { STORAGE_SERVICE } from '@common/constants';
import { DocumentService } from '@domain/storage/document/document.service';
import { IDocument } from '@domain/storage/document';
import { AuthorizationPrivilege } from '@common/enums';
import { FileInfoInputData } from './inputs';
import { FileInfoOutputData, ReadOutputErrorCode } from './outputs';

@Injectable()
export class FileIntegrationService {
  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly authorizationService: AuthorizationService,
    private readonly documentService: DocumentService,
    @Inject(STORAGE_SERVICE) private readonly storageService: StorageService
  ) {}

  public async fileInfo(data: FileInfoInputData): Promise<FileInfoOutputData> {
    const { docId, auth } = data;

    if (!docId) {
      return new FileInfoOutputData({
        read: false,
        errorCode: ReadOutputErrorCode.FILE_NOT_FOUND,
        error: 'Not document id provided',
      });
    }

    if (!auth.cookie && !auth.apiToken) {
      return new FileInfoOutputData({
        read: false,
        errorCode: ReadOutputErrorCode.NO_AUTH_PROVIDED,
        error: 'No authentication data provided',
      });
    }

    const requesterAgentInfo = await this.authenticationService.getAgentInfo(
      auth
    );

    if (!requesterAgentInfo.userID) {
      return new FileInfoOutputData({
        read: false,
        errorCode: ReadOutputErrorCode.USER_NOT_IDENTIFIED,
        error: 'User not identified',
      });
    }

    let document: IDocument | undefined;
    try {
      document = await this.documentService.getDocumentOrFail(docId);
    } catch (e: any) {
      // ... consume
    }

    if (!document) {
      return new FileInfoOutputData({
        read: false,
        errorCode: ReadOutputErrorCode.DOCUMENT_NOT_FOUND,
        error: 'Document not found',
      });
    }

    if (!this.storageService.exists(document.externalID)) {
      return new FileInfoOutputData({
        read: false,
        errorCode: ReadOutputErrorCode.FILE_NOT_FOUND,
        error:
          'The document has been found, but the associated file was not found',
      });
    }

    const canRequesterReadDocument = this.authorizationService.isAccessGranted(
      requesterAgentInfo,
      document.authorization,
      AuthorizationPrivilege.READ
    );

    if (!canRequesterReadDocument) {
      return new FileInfoOutputData({
        read: false,
        errorCode: ReadOutputErrorCode.NO_READ_ACCESS,
        error: 'Insufficient privileges to read the document',
      });
    }

    return new FileInfoOutputData({
      read: canRequesterReadDocument,
      fileName: document.externalID,
      mimeType: document.mimeType,
    });
  }
}
