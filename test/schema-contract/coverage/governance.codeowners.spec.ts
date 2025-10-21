import {
  parseCodeOwnersFile,
  collectAllOwners,
  ownersForPath,
  patternMatches,
} from '@src/schema-contract/governance/codeowners';
import { writeFileSync, existsSync, unlinkSync } from 'node:fs';

describe('schema-contract governance: CODEOWNERS', () => {
  const path = 'tmp/CODEOWNERS.test';
  const content =
    '# comment\n' +
    'src/schema-contract/* @owner1 @Owner2\n' +
    '*.md @docs\n' +
    'platform/*.ts @team/platform\n' +
    '* @catchall\n';

  beforeAll(() => {
    writeFileSync(path, content, 'utf-8');
  });
  afterAll(() => {
    if (existsSync(path)) unlinkSync(path);
  });

  it('parses owners and matches patterns', () => {
    const entries = parseCodeOwnersFile(path);
    const owners = collectAllOwners(entries);
    expect(owners.sort()).toEqual(
      ['Owner2', 'catchall', 'docs', 'owner1', 'team/platform'].sort()
    );
    const file = 'src/schema-contract/diff/diff-types.ts';
    const matched = ownersForPath(entries, file);
    expect(matched).toEqual(
      expect.arrayContaining(['owner1', 'Owner2', 'catchall'])
    );
    const mdMatched = ownersForPath(entries, 'README.md');
    expect(mdMatched).toEqual(expect.arrayContaining(['docs', 'catchall']));
    expect(patternMatches('*', 'anything/here')).toBe(true); // wildcard branch
    // Exact path containing special chars (slashes) should be tested with pattern that includes them verbatim
    expect(patternMatches('src/schema-contract/diff/diff-types.ts', file)).toBe(
      true
    );
  });
});
