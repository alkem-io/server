import { Inject, Injectable } from '@nestjs/common';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { StorageService } from '@services/adapters/storage';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { STORAGE_SERVICE } from '@common/constants';
import { DocumentService } from '@domain/storage/document/document.service';
import { IDocument } from '@domain/storage/document';
import { AuthorizationPrivilege } from '@common/enums';
import { CanReadInputData } from './inputs';
import { CanReadOutputData, ReadOutputErrorCode } from './outputs';

@Injectable()
export class FileIntegrationService {
  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly authorizationService: AuthorizationService,
    private readonly documentService: DocumentService,
    @Inject(STORAGE_SERVICE) private readonly storageService: StorageService
  ) {}

  public async canRead(data: CanReadInputData): Promise<CanReadOutputData> {
    const { docId, auth } = data;

    if (!docId) {
      return new CanReadOutputData(
        false,
        undefined,
        ReadOutputErrorCode.FILE_NOT_FOUND,
        'Not document id provided'
      );
    }

    if (!auth.cookie && !auth.token) {
      return new CanReadOutputData(
        false,
        undefined,
        ReadOutputErrorCode.NO_AUTH_PROVIDED,
        'No authentication data provided'
      );
    }

    const requesterAgentInfo = await this.authenticationService.getAgentInfo(
      auth
    );

    if (!requesterAgentInfo.userID) {
      return new CanReadOutputData(
        false,
        undefined,
        ReadOutputErrorCode.USER_NOT_IDENTIFIED,
        'User not identified'
      );
    }

    let document: IDocument | undefined;
    try {
      document = await this.documentService.getDocumentOrFail(docId);
    } catch (e: any) {
      // ... consume
    }

    if (!document) {
      return new CanReadOutputData(
        false,
        undefined,
        ReadOutputErrorCode.DOCUMENT_NOT_FOUND,
        'Document not found'
      );
    }

    if (!this.storageService.exists(document.externalID)) {
      return new CanReadOutputData(
        false,
        undefined,
        ReadOutputErrorCode.FILE_NOT_FOUND,
        'The document has been found, but the associated file was not found'
      );
    }

    const canRequesterReadDocument = this.authorizationService.isAccessGranted(
      requesterAgentInfo,
      document.authorization,
      AuthorizationPrivilege.READ
    );

    if (!canRequesterReadDocument) {
      return new CanReadOutputData(
        false,
        undefined,
        ReadOutputErrorCode.NO_READ_ACCESS,
        'Insufficient privileges to read the document'
      );
    }

    return new CanReadOutputData(true, document.externalID);
  }
}
