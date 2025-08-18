import { BaseInputData } from './base.input.data';

/**
 * Class representing the data input for when fetching the content of a collaborative document.
 */
export class FetchInputData extends BaseInputData {
  /**
   * @param {string} documentId - The ID of the collaborative document which content is going to be fetched.
   */
  constructor(public documentId: string) {
    super('fetch-input');
  }
}
