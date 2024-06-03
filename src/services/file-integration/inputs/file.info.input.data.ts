import { BaseInputData } from './base.input.data';

export class FileInfoInputData extends BaseInputData {
  constructor(
    public docId: string,
    public auth: {
      cookie?: string;
      apiToken?: string;
    }
  ) {
    super('file-info-input');
  }
}
