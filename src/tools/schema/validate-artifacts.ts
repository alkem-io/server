#!/usr/bin/env ts-node
// Validates change-report.json and deprecations.json against JSON Schemas
import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import path from 'node:path';

const ajv = new Ajv({ allErrors: true, strict: false });

function loadSchema(schemaPath: string) {
  return JSON.parse(readFileSync(schemaPath, 'utf-8'));
}

function validate(docPath: string, schemaPath: string, name: string) {
  const schema = loadSchema(schemaPath);
  const validateFn = ajv.compile(schema);
  const data = JSON.parse(readFileSync(docPath, 'utf-8'));
  const ok = validateFn(data);
  if (!ok) {
    console.error(`❌ ${name} validation failed:`);
    for (const err of validateFn.errors || []) {
      console.error(`  - ${err.instancePath} ${err.message}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`✅ ${name} valid`);
  }
}

function main() {
  const base = path.resolve(
    __dirname,
    '../../../specs/002-schema-contract-diffing/contracts'
  );
  const reportPath = process.argv[2] || 'change-report.json';
  const depPath = process.argv[3] || 'deprecations.json';
  validate(
    reportPath,
    path.join(base, 'change-report.schema.json'),
    'Change Report'
  );
  validate(
    depPath,
    path.join(base, 'deprecations.schema.json'),
    'Deprecations'
  );
}

main();
