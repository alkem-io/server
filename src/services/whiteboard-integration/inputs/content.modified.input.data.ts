import { BaseInputData } from './base.input.data';

/**
 * Class representing the data input for when content is modified.
 */
export class ContentModifiedInputData extends BaseInputData {
  /**
   * Creates a new ContentModifiedInputData instance.
   *
   * @param {string} triggeredBy - The user that triggered the content modification.
   * @param {string} whiteboardId - The ID of the whiteboard where the content was modified.
   */
  constructor(public triggeredBy: string, public whiteboardId: string) {
    super('content-modified');
  }
}
