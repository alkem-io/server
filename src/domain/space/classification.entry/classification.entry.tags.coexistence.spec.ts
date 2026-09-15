/**
 * S-19 / SC-006 / FR-013: freeform Tags (`about.profile.tagsets`) are never
 * read, written or migrated by any classification path — the two systems
 * are deliberately independent, sitting side by side on a Space's About.
 */
import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

const CLASSIFICATION_ENTRY_SOURCE_FILES = [
  `${__dirname}/classification.entry.entity.ts`,
  `${__dirname}/classification.entry.service.ts`,
  `${__dirname}/classification.entry.resolver.mutations.ts`,
  `${__dirname}/classification.entry.resolver.fields.ts`,
  `${__dirname}/classification.entry.validator.ts`,
];

describe('S-19: freeform Tags are untouched by the classification path', () => {
  it.each(
    CLASSIFICATION_ENTRY_SOURCE_FILES
  )('%s references no Tagset symbol', filePath => {
    const source = readFileSync(filePath, 'utf-8');
    expect(source).not.toMatch(/Tagset/);
    expect(source).not.toMatch(/\.tagsets\b/);
  });

  it('the migration touches only classification_entry and template — never profile or tagset', () => {
    const migrationSource = readFileSync(
      `${__dirname}/../../../migrations/1786600000000-AddSpaceClassifications.ts`,
      'utf-8'
    );
    expect(migrationSource).not.toMatch(/"profile"/);
    expect(migrationSource).not.toMatch(/"tagset"/);
  });
});
