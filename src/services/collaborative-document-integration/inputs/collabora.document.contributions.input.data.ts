import { BaseInputData } from './base.input.data';

export class CollaboraDocumentContributionsInputData extends BaseInputData {
  constructor(
    public documentId: string,
    public writeUsers: { id: string }[],
    public readonlyUsers: { id: string }[]
  ) {
    super('collabora-document-contributions');
  }
}
