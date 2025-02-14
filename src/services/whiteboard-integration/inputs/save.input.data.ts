import { BaseInputData } from './base.input.data';

type WhiteboardContent = string;

/**
 * Class representing the data input for when content is modified.
 */
export class SaveInputData extends BaseInputData {
  /**
   * Creates a new ContentModifiedInputData instance.
   * @param {string} whiteboardId - The ID of the whiteboard which is going to be saved.
   * @param {WhiteboardContent} content - The content of the whiteboard.
   */
  constructor(
    public whiteboardId: string,
    public content: WhiteboardContent
  ) {
    super('save-input');
  }
}
