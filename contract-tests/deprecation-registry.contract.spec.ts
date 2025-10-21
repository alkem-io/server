import Ajv from 'ajv';
import { readFileSync } from 'fs';
import path from 'path';

// T007: Contract test for deprecation-registry schema
describe('Contract: deprecation-registry.schema.json', () => {
  const schemaPath = path.resolve(
    __dirname,
    '../specs/002-schema-contract-diffing/contracts/deprecation-registry.schema.json'
  );
  const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
  const ajv = new Ajv({ strict: true, allErrors: true });
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
