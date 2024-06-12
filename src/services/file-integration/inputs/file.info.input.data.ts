import { BaseInputData } from './base.input.data';

export class FileInfoInputData extends BaseInputData {
  constructor(
    public docId: string,
    public auth: {
      cookie?: string;
      authorization?: string;
    }
  ) {
    super('file-info-input');
  }
}
