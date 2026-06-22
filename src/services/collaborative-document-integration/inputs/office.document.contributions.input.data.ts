import { BaseInputData } from './base.input.data';

export class OfficeDocumentContributionsInputData extends BaseInputData {
  constructor(
    public documentId: string,
    public writeUsers: string[],
    public readonlyUsers: string[]
  ) {
    super('office-document-contributions');
  }
}
