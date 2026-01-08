import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { Inject, Injectable } from '@nestjs/common';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { StorageService } from '@services/adapters/storage';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { STORAGE_SERVICE } from '@common/constants';
import { DocumentService } from '@domain/storage/document/document.service';
import { IDocument } from '@domain/storage/document';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { FileInfoInputData } from './inputs';
import { FileInfoOutputData, ReadOutputErrorCode } from './outputs';

@Injectable()
export class FileIntegrationService {
  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly authorizationService: AuthorizationService,
    private readonly documentService: DocumentService,
    @Inject(STORAGE_SERVICE) private readonly storageService: StorageService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: WinstonLogger
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

    if (Object.values(auth).length === 0) {
      return new FileInfoOutputData({
        read: false,
        errorCode: ReadOutputErrorCode.NO_AUTH_PROVIDED,
        error: 'No authentication data provided',
      });
    }

    const requesterAgentInfo =
      await this.authenticationService.getAgentInfo(auth);

    let document: IDocument | undefined;
    try {
      document = await this.documentService.getDocumentOrFail(docId);
    } catch {
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

    if (!document.authorization) {
      return new FileInfoOutputData({
        read: false,
        errorCode: ReadOutputErrorCode.DOCUMENT_AUTH_NOT_FOUND,
        error: 'Document has no authorization policy data',
      });
    }

    const canRequesterReadDocument =
      await this.authorizationService.isAccessGrantedRemoteEvaluation(
        requesterAgentInfo.agentID,
        document.authorization.id,
        AuthorizationPrivilege.READ
      );
    // was there an error during remote evaluation?
    if (canRequesterReadDocument.error) {
      const { code, dependency, retryAfterMs } = canRequesterReadDocument.error;
      this.logger.error(
        {
          message: 'Error during remote authorization evaluation',
          agentId: requesterAgentInfo.agentID,
          authorizationPolicyId: document.authorization.id,
          reason: canRequesterReadDocument.reason,
          code,
          dependency,
          retryAfterMs,
        },
        undefined,
        LogContext.FILE_INTEGRATION
      );
      return new FileInfoOutputData({
        read: false,
        errorCode: ReadOutputErrorCode.REMOTE_AUTHZ_ERROR,
        error: canRequesterReadDocument.reason ?? 'Unknown reason',
      });
    }
    // there is no error, but access is denied
    if (!canRequesterReadDocument.allowed) {
      return new FileInfoOutputData({
        read: false,
        errorCode: ReadOutputErrorCode.NO_READ_ACCESS,
        error: 'Insufficient privileges to read the document',
      });
    }
    // everything is fine and access is granted
    return new FileInfoOutputData({
      read: canRequesterReadDocument.allowed,
      fileName: document.externalID,
      mimeType: document.mimeType,
    });
  }
}
