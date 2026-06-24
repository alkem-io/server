import { BaseInputData } from './base.input.data';

export class OfficeDocumentContributionsInputData extends BaseInputData {
  constructor(
    public documentId: string,
    public writeActors: string[],
    public readonlyActors: string[]
  ) {
    super('office-document-contributions');
  }
}
