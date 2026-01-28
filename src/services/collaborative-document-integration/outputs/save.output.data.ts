import { SaveErrorCodes } from '@services/collaborative-document-integration/types';
import { BaseOutputData } from './base.output.data';

export class SaveOutputData extends BaseOutputData {
  constructor(public data: SaveContentData | SaveErrorData) {
    super('save-output');
  }
}

export class SaveContentData {
  public readonly success = true;
}

export class SaveErrorData {
  constructor(
    public error: string,
    public code: SaveErrorCodes
  ) {}
}

export const isSaveErrorData = (
  data: SaveContentData | SaveErrorData
): data is SaveErrorData => {
  return (data as SaveErrorData).error !== undefined;
};
