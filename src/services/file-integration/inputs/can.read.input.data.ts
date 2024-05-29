import { BaseInputData } from './base.input.data';

export class CanReadInputData extends BaseInputData {
  constructor(
    public docId: string,
    public auth: {
      cookie?: string;
      token?: string;
    }
  ) {
    super('read');
  }
}
