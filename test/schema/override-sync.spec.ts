import { performOverrideEvaluation } from '../../src/tools/schema/override';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

describe('synchronous override evaluation (env-only)', () => {
  const OLD_ENV = process.env;

  let _tmpDir: string | undefined;
  let _tmpCodeownersPath: string | undefined;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    // create a temporary directory and write a CODEOWNERS file inside it
    try {
      _tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codeowners-'));
      _tmpCodeownersPath = path.join(_tmpDir, 'CODEOWNERS');
      fs.writeFileSync(_tmpCodeownersPath, '* @bob');
      // point the code to the temp file instead of repo root
      process.env.SCHEMA_OVERRIDE_CODEOWNERS_PATH = _tmpCodeownersPath;
    } catch {
      // ignore; tests will still run but parseCodeOwners may return []
    }
  });

  afterEach(() => {
    // restore environment
    process.env = OLD_ENV;
    // clear the special env var if set
    try {
      delete process.env.SCHEMA_OVERRIDE_CODEOWNERS_PATH;
    } catch {
      /* ignore */
    }
    // remove temp file and directory
    try {
      if (_tmpCodeownersPath) fs.unlinkSync(_tmpCodeownersPath);
    } catch {
      /* ignore */
    }
    try {
      if (_tmpDir) fs.rmdirSync(_tmpDir);
    } catch {
      /* ignore */
    }
  });

  it('returns helpful details when no env reviews are provided', () => {
    delete process.env.SCHEMA_OVERRIDE_REVIEWS_JSON;
    delete process.env.SCHEMA_OVERRIDE_REVIEWS_FILE;
    const res = performOverrideEvaluation();
    expect(res.applied).toBe(false);
    expect(
      res.details.some(d => d.includes('No reviews provided via environment'))
    ).toBe(true);
  });

  it('applies override when env reviews include owner with phrase', () => {
    process.env.SCHEMA_OVERRIDE_REVIEWS_JSON = JSON.stringify([
      { reviewer: 'bob', body: 'OK BREAKING-APPROVED', state: 'APPROVED' },
    ]);
    const res = performOverrideEvaluation();
    expect(res.applied).toBe(true);
    expect(res.reviewer).toBe('bob');
  });
});
