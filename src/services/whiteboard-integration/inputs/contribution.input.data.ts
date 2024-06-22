import { BaseInputData } from './base.input.data';

export class ContributionInputData extends BaseInputData {
  constructor(
    public whiteboardId: string,
    public users: [{ id: string; email: string }]
  ) {
    super('contribution');
  }
}
