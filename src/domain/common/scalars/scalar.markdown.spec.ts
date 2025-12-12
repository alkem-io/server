import { Markdown } from './scalar.markdown';

describe('Markdown Scalar', () => {
  let scalar: Markdown;

  beforeEach(() => {
    scalar = new Markdown();
  });

  it('should pass through string values in serialize', () => {
    const value = 'some text with  double spaces and \\ backslashes';
    expect(scalar.serialize(value)).toBe(value);
  });

  it('should pass through values unchanged', () => {
    const value = '## Header  <strong>Bold</strong>  *   List item';
    expect(scalar.serialize(value)).toBe(value);
  });
});
