import { loadBaselineSnapshot } from '@src/schema-contract/snapshot/load-baseline';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'crypto';
import { sha256 } from '../../../src/schema-contract/diff/diff-core';
import { join } from 'node:path';


describe('schema-contract: loadBaselineSnapshot', () => {
  const tmpDir = 'tmp';
  const filePath = join(tmpDir, 'test-baseline-schema.graphql');
  const sdl = 'type X { a: String }\nscalar S\nenum E { A }\n';

  beforeAll(() => {
    if (!existsSync(tmpDir)) mkdirSync(tmpDir);
  });

  afterAll(() => {
    if (existsSync(filePath)) unlinkSync(filePath);
  });

  it('returns exists=false for missing file', () => {
    const r = loadBaselineSnapshot('non-existent-file.graphql');
    expect(r.exists).toBe(false);
    expect(r.sdl).toBeNull();
  });

  it('loads snapshot metadata for existing SDL file', () => {
    writeFileSync(filePath, sdl, 'utf-8');
    const r = loadBaselineSnapshot(filePath);
    expect(r.exists).toBe(true);
    expect(r.sdl).toBe(sdl);
    expect(r.snapshot).toBeDefined();
    expect(r.snapshot?.id).toBe(sha256(sdl));
    expect(r.snapshot?.elementCount).toBe(3); // type + scalar + enum
  });
});
