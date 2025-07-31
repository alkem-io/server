import { BaseInputData } from './base.input.data';

/**
 * Class representing the data input for when content is modified.
 */
export class SaveInputData extends BaseInputData {
  /**
   * Creates a new ContentModifiedInputData instance.
   * @param {string} documentId - The ID of the collaborative document which is going to be saved.
   * @param {string} binaryStateInBase64 - The binary content of the document encoded in Base64.
   */
  constructor(
    public documentId: string,
    public binaryStateInBase64: string
  ) {
    super('save-input');
  }
}
