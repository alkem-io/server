import { BaseInputData } from './base.input.data';

export class InfoInputData extends BaseInputData {
  constructor(
    public userId: string,
    public documentId: string
  ) {
    super('info');
  }
}
