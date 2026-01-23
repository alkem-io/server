import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import path from 'path';

// T007: Contract test for deprecation-registry schema
describe('Contract: deprecation-registry.schema.json', () => {
  const schemaPath = path.resolve(
    __dirname,
    '../specs/002-schema-contract-diffing/contracts/deprecation-registry.schema.json'
  );
  const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
  // Use Ajv2020 for draft 2020-12 schema support with formats
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  it('accepts a minimal valid registry object', () => {
    const sample = {
      generatedAt: new Date().toISOString(),
      entries: [
        {
          element: 'User.status',
          elementType: 'FIELD',
          sinceDate: '2025-10-01',
          removeAfter: '2026-01-01',
          humanReason: 'Cleanup',
          formatValid: true,
          retired: false,
        },
      ],
    };
    const ok = validate(sample);
    if (!ok) console.error(validate.errors);
    expect(ok).toBe(true);
  });

  it('rejects invalid date formats', () => {
    const sample = {
      generatedAt: new Date().toISOString(),
      entries: [
        {
          element: 'User.status',
          elementType: 'FIELD',
          sinceDate: '2025/10/01', // invalid
          removeAfter: '2026-01-01',
          humanReason: 'Cleanup',
          formatValid: true,
          retired: false,
        },
      ],
    };
    const ok = validate(sample);
    expect(ok).toBe(false);
  });
});
