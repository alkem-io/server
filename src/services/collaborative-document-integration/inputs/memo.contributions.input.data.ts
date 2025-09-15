import { BaseInputData } from './base.input.data';

export class MemoContributionsInputData extends BaseInputData {
  constructor(
    public memoId: string,
    public users: { id: string; email: string }[]
  ) {
    super('memo-contributions');
  }
}
