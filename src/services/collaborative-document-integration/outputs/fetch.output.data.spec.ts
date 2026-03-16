import { FetchErrorCodes } from '../types';
import {
  FetchContentData,
  FetchErrorData,
  FetchOutputData,
  isFetchErrorData,
} from './fetch.output.data';

describe('FetchOutputData', () => {
  describe('FetchOutputData constructor', () => {
    it('should set the event to "fetch-output"', () => {
      const output = new FetchOutputData(new FetchContentData('abc'));
      expect(output.event).toBe('fetch-output');
    });
  });

  describe('FetchContentData', () => {
    it('should store contentBase64', () => {
      const data = new FetchContentData('base64string');
      expect(data.contentBase64).toBe('base64string');
    });

    it('should allow undefined contentBase64', () => {
      const data = new FetchContentData(undefined);
      expect(data.contentBase64).toBeUndefined();
    });
  });

  describe('FetchErrorData', () => {
    it('should store error message and code', () => {
      const data = new FetchErrorData('not found', FetchErrorCodes.NOT_FOUND);
      expect(data.error).toBe('not found');
      expect(data.code).toBe(FetchErrorCodes.NOT_FOUND);
    });
  });

  describe('isFetchErrorData', () => {
    it('should return true for FetchErrorData', () => {
      const errorData = new FetchErrorData(
        'error',
        FetchErrorCodes.INTERNAL_ERROR
      );
      expect(isFetchErrorData(errorData)).toBe(true);
    });

    it('should return false for FetchContentData', () => {
      const contentData = new FetchContentData('abc');
      expect(isFetchErrorData(contentData)).toBe(false);
    });

    it('should return false for FetchContentData with undefined content', () => {
      const contentData = new FetchContentData(undefined);
      expect(isFetchErrorData(contentData)).toBe(false);
    });
  });
});
