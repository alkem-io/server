import { BaseOutputData } from './base.output.data';

export class FetchOutputData extends BaseOutputData {
  constructor(public data: FetchContentData | FetchErrorData) {
    super('fetch-output');
  }
}

export class FetchContentData {
  constructor(public content: string) {}
}

export class FetchErrorData {
  constructor(public error: string) {}
}
