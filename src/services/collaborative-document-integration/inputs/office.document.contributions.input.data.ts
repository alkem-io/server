import { BaseInputData } from './base.input.data';

export class OfficeDocumentContributionsInputData extends BaseInputData {
  constructor(
    public documentId: string,
    public writeUsers: { id: string }[],
    public readonlyUsers: { id: string }[]
  ) {
    super('office-document-contributions');
  }
}
