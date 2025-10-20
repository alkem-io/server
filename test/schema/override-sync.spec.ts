import { performOverrideEvaluation } from '../../src/tools/schema/override';
import * as fs from 'node:fs';

describe('synchronous override evaluation (env-only)', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    try {
      fs.writeFileSync('CODEOWNERS', '* @bob');
    } catch {
      // ignore
    }
  });

  afterEach(() => {
    process.env = OLD_ENV;
    try {
      fs.unlinkSync('CODEOWNERS');
    } catch {
      /* ignore */
    }
  });

  it('returns helpful details when no env reviews are provided', () => {
    delete process.env.SCHEMA_OVERRIDE_REVIEWS_JSON;
    delete process.env.SCHEMA_OVERRIDE_REVIEWS_FILE;
    const res = performOverrideEvaluation();
    expect(res.applied).toBe(false);
    expect(res.details.some(d => d.includes('No reviews provided via environment'))).toBe(true);
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
