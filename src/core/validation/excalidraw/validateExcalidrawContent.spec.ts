import { validateExcalidrawContent } from './validateExcalidrawContent';

describe('validateExcalidrawContent', () => {
  it('should return undefined for valid excalidraw content', () => {
    const content = JSON.stringify({
      elements: [{ type: 'rectangle' }],
    });

    const result = validateExcalidrawContent(content);

    expect(result).toBeUndefined();
  });

  it('should return undefined for content with optional fields', () => {
    const content = JSON.stringify({
      elements: [],
      source: 'excalidraw',
      appState: { theme: 'dark' },
    });

    const result = validateExcalidrawContent(content);

    expect(result).toBeUndefined();
  });

  it('should return Error for invalid JSON', () => {
    const result = validateExcalidrawContent('not-json{');

    expect(result).toBeInstanceOf(Error);
  });

  it('should return validation errors when elements is missing', () => {
    const content = JSON.stringify({ source: 'test' });

    const result = validateExcalidrawContent(content);

    expect(Array.isArray(result)).toBe(true);
    expect((result as any[]).length).toBeGreaterThan(0);
  });

  it('should return validation errors when elements is not an array', () => {
    const content = JSON.stringify({ elements: 'not-array' });

    const result = validateExcalidrawContent(content);

    expect(Array.isArray(result)).toBe(true);
  });
});
