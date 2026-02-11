import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import path from 'path';

// T006: Contract test for change-report schema validation
describe('Contract: change-report.schema.json', () => {
  const schemaPath = path.resolve(
    __dirname,
    '../specs/002-schema-contract-diffing/contracts/change-report.schema.json'
  );
  const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
  // Use Ajv with formats for draft-07 schema support
  const ajv = new Ajv({ strict: true, allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  it('accepts a minimal valid change report object', () => {
    const sample = {
      snapshotId: 'hash-current',
      baseSnapshotId: null,
      generatedAt: new Date().toISOString(),
      overrideApplied: false,
      classifications: { ADDITIVE: 0 },
      entries: [],
    };
    const ok = validate(sample);
    if (!ok) {
      console.error(validate.errors);
    }
    expect(ok).toBe(true);
  });
});
