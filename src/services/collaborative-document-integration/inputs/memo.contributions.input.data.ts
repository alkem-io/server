import { BaseInputData } from './base.input.data';

export class MemoContributionsInputData extends BaseInputData {
  constructor(
    public memoId: string,
    public users: { id: string }[]
  ) {
    super('memo-contributions');
  }
}
