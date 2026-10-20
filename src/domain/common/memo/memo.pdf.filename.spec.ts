import { memoPdfFilename } from './memo.pdf.filename';

describe('memoPdfFilename', () => {
  const now = new Date('2026-10-19T23:30:00.000Z');
  const grammar = /^[a-z0-9-]{1,80}-\d{4}-\d{2}-\d{2}\.pdf$/;

  it.each([
    ['Board decision — Q4', 'board-decision-q4-2026-10-19.pdf'],
    ['  Hello, World!  ', 'hello-world-2026-10-19.pdf'],
    ['Решение', 'memo-2026-10-19.pdf'],
    ['', 'memo-2026-10-19.pdf'],
    ['---', 'memo-2026-10-19.pdf'],
    [undefined, 'memo-2026-10-19.pdf'],
  ])('maps %j to %s', (displayName, expected) => {
    const filename = memoPdfFilename(displayName, now);
    expect(filename).toBe(expected);
    expect(filename).toMatch(grammar);
  });

  it('caps the slug at 80 characters', () => {
    const filename = memoPdfFilename('a'.repeat(200), now);
    expect(filename).toBe(`${'a'.repeat(80)}-2026-10-19.pdf`);
    expect(filename).toMatch(grammar);
  });

  it('re-trims a cut that would end the slug in a dash', () => {
    const filename = memoPdfFilename(`${'a'.repeat(79)} b`, now);
    expect(filename).toBe(`${'a'.repeat(79)}-2026-10-19.pdf`);
    expect(filename).toMatch(grammar);
  });

  it('uses the UTC calendar date of the request', () => {
    expect(
      memoPdfFilename('Notes', new Date('2026-12-31T23:59:59.999-02:00'))
    ).toBe('notes-2027-01-01.pdf');
  });
});
