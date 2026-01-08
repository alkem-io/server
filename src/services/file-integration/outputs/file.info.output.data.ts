import { BaseOutputData } from './base.output.data';

export enum ReadOutputErrorCode {
  USER_NOT_IDENTIFIED = 'user-not-identified',
  NO_AUTH_PROVIDED = 'no-auth-provided',
  REMOTE_AUTHZ_ERROR = 'remote-authz-error',
  DOCUMENT_NOT_FOUND = 'document-not-found',
  DOCUMENT_AUTH_NOT_FOUND = 'document-auth-not-found',
  FILE_NOT_FOUND = 'file-not-found',
  NO_READ_ACCESS = 'no-read-access',
}

type Data = {
  read: boolean;
};

type ErroredData = {
  errorCode: ReadOutputErrorCode;
  error: string;
};

type SuccessData = {
  fileName: string;
  mimeType: string;
};

type Body = Data & (ErroredData | SuccessData);

export class FileInfoOutputData extends BaseOutputData {
  constructor(public data: Body) {
    super('file-info-output');
  }
}
