import { BaseInputData } from './base.input.data';

/**
 * Class representing the data input for when fetching the content of a whiteboard.
 */
export class FetchInputData extends BaseInputData {
  /**
   * @param {string} whiteboardId - The ID of the whiteboard which content is going to be fetched.
   */
  constructor(public whiteboardId: string) {
    super('fetch-input');
  }
}
