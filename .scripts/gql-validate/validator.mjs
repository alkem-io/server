#!/usr/bin/env node
/**
 * GQL Validation Engine
 *
 * Validates .graphql operations from multiple source repos against
 * the server's schema.graphql using AST-level validation (no running server needed).
 *
 * Each source repo gets its own isolated fragment namespace to prevent
 * cross-contamination (e.g. identically-named fragments with different fields).
 *
 * Uses graphql v16.11.0 validate() to catch field mismatches, type errors,
 * and variable issues. A custom visitor detects deprecated field usage.
 *
 * Output: per-query JSON files in .claude/pipeline/results/<source>/
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, relative, basename } from 'path';
import { fileURLToPath } from 'url';
import {
  buildSchema,
  parse,
  validate,
  visit,
  TypeInfo,
  visitWithTypeInfo,
  Kind,
} from 'graphql';
import { resolveFragments } from './resolve-fragments.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = join(__dirname, '../..');

// ─── Configuration ──────────────────────────────────────────────────────────

const config = loadConfig();

function loadConfig() {
  const envPath = join(REPO_ROOT, '.claude/pipeline/.env');
  const envContent = readFileSync(envPath, 'utf-8');
  const vars = {};

  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Z_]+)=(.+)$/);
    if (match) {
      let val = match[2].replace(/^['"]|['"]$/g, '');
      // Expand ${VAR} references
      val = val.replace(/\$\{(\w+)\}/g, (_, name) => vars[name] || '');
      vars[match[1]] = val;
    }
  }

  return {
    testSuitesDir: vars.TEST_SUITES_DIR,
    testSuitesGraphqlDir: vars.TEST_SUITES_GRAPHQL_DIR,
    clientWebDir: vars.CLIENT_WEB_DIR,
    clientWebGraphqlDir: vars.CLIENT_WEB_GRAPHQL_DIR,
    schemaPath: join(REPO_ROOT, vars.SERVER_SCHEMA_PATH || 'schema.graphql'),
    resultsDir: join(REPO_ROOT, '.claude/pipeline/results'),
  };
}

// ─── Source Definitions ─────────────────────────────────────────────────────

const sources = [
  {
    name: 'test-suites',
    dir: config.testSuitesGraphqlDir,
    baseDir: config.testSuitesDir,
    pattern: '**/*.graphql',
    exclude: [],
  },
  {
    name: 'client-web',
    dir: config.clientWebGraphqlDir,
    baseDir: config.clientWebDir,
    pattern: '**/*.graphql',
    exclude: ['core/apollo/generated/'],
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function findGraphqlFiles(dir, excludePatterns = []) {
  const results = [];

  function walk(d) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      const rel = relative(dir, full);

      // Check exclude patterns
      if (excludePatterns.some(pat => rel.startsWith(pat))) continue;

      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (entry.endsWith('.graphql')) {
        results.push(full);
      }
    }
  }

  walk(dir);
  return results;
}

function categorizeError(msg) {
  if (/unknown field|cannot query field/i.test(msg)) return 'SCHEMA_MISMATCH';
  if (/type .* must define one or more fields|expected type/i.test(msg)) return 'TYPE_ERROR';
  if (/variable/i.test(msg)) return 'VARIABLE_ERROR';
  if (/unknown fragment|fragment .* is never used/i.test(msg)) return 'FRAGMENT_ERROR';
  return 'SCHEMA_MISMATCH'; // default bucket
}

// ─── Validate a Single Source ───────────────────────────────────────────────

function validateSource(source, schema) {
  console.log(`\n── Source: ${source.name} ──`);
  console.log(`Scanning: ${source.dir}`);

  const allFiles = findGraphqlFiles(source.dir, source.exclude);
  console.log(`Found ${allFiles.length} .graphql files`);

  // Parse all files, collect fragments into a source-local map
  const fragmentMap = new Map();
  const operationFiles = [];
  const parseErrors = [];

  for (const file of allFiles) {
    try {
      const sourceText = readFileSync(file, 'utf-8');
      const doc = parse(sourceText);

      const operations = [];
      const fragments = [];

      for (const def of doc.definitions) {
        if (def.kind === Kind.OPERATION_DEFINITION) {
          operations.push(def);
        } else if (def.kind === Kind.FRAGMENT_DEFINITION) {
          fragments.push(def);
        }
      }

      // Register fragments in source-local map
      for (const frag of fragments) {
        fragmentMap.set(frag.name.value, frag);
      }

      if (operations.length > 0) {
        operationFiles.push({ file, doc, operations });
      }
    } catch (err) {
      parseErrors.push({
        file: relative(source.dir, file),
        error: err.message,
      });
    }
  }

  if (parseErrors.length > 0) {
    console.log(`Parse errors: ${parseErrors.length}`);
    for (const pe of parseErrors) {
      console.log(`  PARSE_ERROR: ${pe.file}: ${pe.error}`);
    }
  }

  // Create source-specific results directory
  const sourceResultsDir = join(config.resultsDir, source.name);
  mkdirSync(sourceResultsDir, { recursive: true });

  // Validate each operation
  let passCount = 0;
  let failCount = 0;
  let deprecatedCount = 0;
  const results = [];

  for (const { file, doc, operations } of operationFiles) {
    for (const op of operations) {
      const queryName = op.name?.value || basename(file, '.graphql');
      const relFile = relative(source.baseDir, file);

      // Resolve transitive fragments from source-local map
      const opDoc = { kind: Kind.DOCUMENT, definitions: [op] };
      const resolvedFragments = resolveFragments(opDoc, fragmentMap);
      const fragmentNames = [...resolvedFragments].map(f => f.name.value);

      // Build combined document: operation + all referenced fragments
      const combinedDoc = {
        kind: Kind.DOCUMENT,
        definitions: [op, ...resolvedFragments],
      };

      // Run graphql validate()
      const validationErrors = validate(schema, combinedDoc);

      // Check for deprecated field usage
      const deprecations = [];
      try {
        const typeInfo = new TypeInfo(schema);
        visit(
          combinedDoc,
          visitWithTypeInfo(typeInfo, {
            Field() {
              const fieldDef = typeInfo.getFieldDef();
              if (fieldDef?.deprecationReason) {
                deprecations.push({
                  field: fieldDef.name,
                  reason: fieldDef.deprecationReason,
                  parentType: typeInfo.getParentType()?.name,
                });
              }
            },
          })
        );
      } catch {
        // Deprecated-field detection is best-effort; don't fail validation
      }

      // Classify errors
      const errors = validationErrors.map(err => ({
        message: err.message,
        category: categorizeError(err.message),
        locations: err.locations || [],
      }));

      const status = errors.length > 0 ? 'error' : 'success';
      if (status === 'error') {
        failCount++;
      } else {
        passCount++;
      }

      if (deprecations.length > 0) {
        deprecatedCount++;
      }

      const result = {
        source: source.name,
        query_name: queryName,
        query_file: relFile,
        status,
        errors,
        deprecations,
        fragments_used: fragmentNames,
        timestamp: new Date().toISOString(),
      };

      results.push(result);

      // Write per-query result JSON to source subdirectory
      const outFile = join(sourceResultsDir, `${queryName}.json`);
      writeFileSync(outFile, JSON.stringify(result, null, 2));

      // Console output
      if (status === 'error') {
        console.log(`  FAIL  ${queryName} (${relFile})`);
        for (const e of errors) {
          console.log(`        [${e.category}] ${e.message}`);
        }
      } else if (deprecations.length > 0) {
        console.log(`  WARN  ${queryName} — ${deprecations.length} deprecated field(s)`);
      }
    }
  }

  return { passCount, failCount, deprecatedCount, parseErrors, results };
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  console.log('=== GQL Validation Pipeline ===\n');

  // 1. Load schema
  console.log(`Loading schema: ${config.schemaPath}`);
  const schemaSource = readFileSync(config.schemaPath, 'utf-8');
  const schema = buildSchema(schemaSource);

  // 2. Validate each source with isolated fragment namespaces
  const sourceSummaries = {};
  let aggregatePass = 0;
  let aggregateFail = 0;
  let aggregateDeprecated = 0;
  let aggregateParseErrors = 0;

  for (const source of sources) {
    const { passCount, failCount, deprecatedCount, parseErrors } =
      validateSource(source, schema);

    const total = passCount + failCount;
    sourceSummaries[source.name] = {
      total,
      pass: passCount,
      fail: failCount,
      deprecated: deprecatedCount,
      parse_errors: parseErrors.length,
    };

    aggregatePass += passCount;
    aggregateFail += failCount;
    aggregateDeprecated += deprecatedCount;
    aggregateParseErrors += parseErrors.length;
  }

  const aggregateTotal = aggregatePass + aggregateFail;

  // 3. Summary
  console.log('\n=== Validation Summary ===');
  for (const [name, s] of Object.entries(sourceSummaries)) {
    console.log(`\n  ${name}:`);
    console.log(`    Total:      ${s.total}`);
    console.log(`    Pass:       ${s.pass}`);
    console.log(`    Fail:       ${s.fail}`);
    console.log(`    Deprecated: ${s.deprecated}`);
    if (s.parse_errors > 0) {
      console.log(`    Parse errors: ${s.parse_errors}`);
    }
  }

  console.log(`\n  Aggregate:`);
  console.log(`    Total:      ${aggregateTotal}`);
  console.log(`    Pass:       ${aggregatePass}`);
  console.log(`    Fail:       ${aggregateFail}`);
  console.log(`    Deprecated: ${aggregateDeprecated}`);
  if (aggregateParseErrors > 0) {
    console.log(`    Parse errors: ${aggregateParseErrors}`);
  }
  console.log(`\nResults written to: ${config.resultsDir}`);

  // Write summary file
  mkdirSync(config.resultsDir, { recursive: true });
  const summary = {
    sources: sourceSummaries,
    aggregate: {
      total: aggregateTotal,
      pass: aggregatePass,
      fail: aggregateFail,
      deprecated: aggregateDeprecated,
      parse_errors: aggregateParseErrors,
    },
    timestamp: new Date().toISOString(),
  };
  writeFileSync(
    join(config.resultsDir, '_summary.json'),
    JSON.stringify(summary, null, 2)
  );

  // Exit with error code if failures
  if (aggregateFail > 0) {
    process.exit(1);
  }
}

main();
