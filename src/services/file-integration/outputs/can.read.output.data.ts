import { BaseOutputData } from './base.output.data';

export enum ReadOutputErrorCode {
  USER_NOT_IDENTIFIED = 'user-not-identified',
  NO_AUTH_PROVIDED = 'no-auth-provided',
  DOCUMENT_NOT_FOUND = 'document-not-found',
  FILE_NOT_FOUND = 'file-not-found',
  NO_READ_ACCESS = 'no-read-access',
}

export class CanReadOutputData extends BaseOutputData {
  constructor(
    public read: boolean,
    public fileName?: string,
    public errorCode?: ReadOutputErrorCode,
    public error?: string
  ) {
    super('can-read-output');
  }
}
