import { FetchErrorCodes } from '../types';
import { BaseOutputData } from './base.output.data';

export class FetchOutputData extends BaseOutputData {
  constructor(public data: FetchContentData | FetchErrorData) {
    super('fetch-output');
  }
}

export class FetchContentData {
  constructor(public contentBase64: string | undefined) {}
}

export class FetchErrorData {
  constructor(
    public error: string,
    public code: FetchErrorCodes
  ) {}
}

export const isFetchErrorData = (
  data: FetchContentData | FetchErrorData
): data is FetchErrorData => {
  return (data as FetchErrorData).error !== undefined;
};
