import { SaveErrorCodes } from '../types';
import {
  isSaveErrorData,
  SaveContentData,
  SaveErrorData,
  SaveOutputData,
} from './save.output.data';

describe('SaveOutputData', () => {
  describe('SaveOutputData constructor', () => {
    it('should set the event to "save-output"', () => {
      const output = new SaveOutputData(new SaveContentData());
      expect(output.event).toBe('save-output');
    });
  });

  describe('SaveContentData', () => {
    it('should have success set to true', () => {
      const data = new SaveContentData();
      expect(data.success).toBe(true);
    });
  });

  describe('SaveErrorData', () => {
    it('should store error message and code', () => {
      const data = new SaveErrorData('not found', SaveErrorCodes.NOT_FOUND);
      expect(data.error).toBe('not found');
      expect(data.code).toBe(SaveErrorCodes.NOT_FOUND);
    });
  });

  describe('isSaveErrorData', () => {
    it('should return true for SaveErrorData', () => {
      const errorData = new SaveErrorData(
        'error',
        SaveErrorCodes.INTERNAL_ERROR
      );
      expect(isSaveErrorData(errorData)).toBe(true);
    });

    it('should return false for SaveContentData', () => {
      const contentData = new SaveContentData();
      expect(isSaveErrorData(contentData)).toBe(false);
    });
  });
});
