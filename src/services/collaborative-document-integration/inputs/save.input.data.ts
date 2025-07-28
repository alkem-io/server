import { BaseInputData } from './base.input.data';

/**
 * Class representing the data input for when content is modified.
 */
export class SaveInputData extends BaseInputData {
  /**
   * Creates a new ContentModifiedInputData instance.
   * @param {string} documentId - The ID of the collaborative document which is going to be saved.
   * @param {string} content - The content of the collaborative document.
   */
  constructor(
    public documentId: string,
    public content: string
  ) {
    super('save-input');
  }
}
