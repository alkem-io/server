#!/usr/bin/env node
/**
 * GQL Performance Benchmark Runner
 *
 * Executes GraphQL queries against a running server and compares response
 * times against a stored baseline to detect performance regressions.
 *
 * Exit codes:
 *   0 - All queries within thresholds (or --save-baseline mode)
 *   1 - Fatal error (auth, server unreachable, etc.)
 *   2 - Regressions detected
 *
 * Usage:
 *   node bench-runner.mjs --source test-suites|client-web|both [options]
 *     --save-baseline              Save current run as baseline (no comparison)
 *     --env-file <path>            Override .env path
 *     --threshold-multiplier <n>   Flag if current > baseline * n (default: 2.0)
 *     --threshold-absolute <n>     Flag if delta > n ms (default: 500)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseArgs } from 'node:util';

import {
  DISCOVERY_QUERIES,
  loadEnvFile,
  sleep,
  buildFragmentMap,
  resolveFragments,
  extractOperationDef,
  findGraphqlFiles,
  parseOperations,
  DiscoveryContext,
  classifyOperation,
  extractDiscoveryIds,
  percentile,
} from './gql-runner-lib.mjs';

// ─── CLI args ───────────────────────────────────────────────────────────────
const { values: args } = parseArgs({
  options: {
    source: { type: 'string' },
    'save-baseline': { type: 'boolean', default: false },
    'env-file': { type: 'string', default: '' },
    'threshold-multiplier': { type: 'string', default: '2.0' },
    'threshold-absolute': { type: 'string', default: '500' },
  },
});

const VALID_SOURCES = ['test-suites', 'client-web', 'both'];
if (!args.source || !VALID_SOURCES.includes(args.source)) {
  console.error('Usage: node bench-runner.mjs --source test-suites|client-web|both [options]');
  console.error('  --save-baseline              Save current run as baseline');
  console.error('  --env-file <path>            Override .env path');
  console.error('  --threshold-multiplier <n>   Regression multiplier (default: 2.0)');
  console.error('  --threshold-absolute <n>     Regression absolute delta ms (default: 500)');
  process.exit(1);
}

const SAVE_BASELINE = args['save-baseline'];
const THRESHOLD_MULTIPLIER = parseFloat(args['threshold-multiplier']);
const THRESHOLD_ABSOLUTE = parseFloat(args['threshold-absolute']);

// ─── Configuration ──────────────────────────────────────────────────────────
const SCRIPT_DIR = new URL('.', import.meta.url).pathname;
const PROJECT_DIR = join(SCRIPT_DIR, '..', '..');
const PIPELINE_DIR = join(PROJECT_DIR, '.claude', 'pipeline');
const BENCH_DIR = join(PIPELINE_DIR, 'benchmarks');

const envFile = args['env-file'] || join(PIPELINE_DIR, '.env');
const env = loadEnvFile(envFile);

const GQL_ENDPOINT = env.GRAPHQL_NON_INTERACTIVE_ENDPOINT
  || 'http://localhost:3000/api/private/non-interactive/graphql';

const TOKEN_FILE = join(PIPELINE_DIR, '.session-token');
const SESSION_TOKEN = readFileSync(TOKEN_FILE, 'utf8').trim();

const SOURCE_DIRS = {
  'test-suites': env.TEST_SUITES_GRAPHQL_DIR || '',
  'client-web': env.CLIENT_WEB_GRAPHQL_DIR || '',
};

const BASELINE_FILE = join(BENCH_DIR, 'baseline.json');
const REPORT_FILE = join(BENCH_DIR, 'report.json');

const REQUEST_DELAY_MS = 100;
const REQUEST_TIMEOUT_MS = 15_000;

// ─── Network helpers ────────────────────────────────────────────────────────

async function gqlFetchWithTimeout(query, variables = null, operationName = null, timeoutMs = REQUEST_TIMEOUT_MS) {
  const body = { query };
  if (variables) body.variables = variables;
  if (operationName) body.operationName = operationName;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const start = performance.now();
  try {
    const res = await fetch(GQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SESSION_TOKEN}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const elapsed = Math.round(performance.now() - start);
    const json = await res.json();
    return { httpStatus: res.status, data: json.data, errors: json.errors || [], elapsed };
  } catch (err) {
    const elapsed = Math.round(performance.now() - start);
    if (err.name === 'AbortError') {
      return { httpStatus: 0, data: null, errors: [{ message: 'Request timeout' }], elapsed };
    }
    return { httpStatus: 0, data: null, errors: [{ message: err.message }], elapsed };
  } finally {
    clearTimeout(timeout);
  }
}

async function gqlFetch(query, variables = null, operationName = null) {
  return gqlFetchWithTimeout(query, variables, operationName, REQUEST_TIMEOUT_MS);
}

// ─── Discovery ──────────────────────────────────────────────────────────────

async function runDiscovery(context) {
  console.log('\n=== Phase 0: Discovery ===');
  const timing = { start: performance.now() };

  for (const dq of DISCOVERY_QUERIES) {
    const result = await gqlFetch(dq.query);

    if (result.httpStatus === 401) {
      console.error('FATAL: Authentication failed (401). Token may be expired.');
      process.exit(1);
    }

    if (result.data) {
      extractDiscoveryIds(dq.name, result.data, context);
    }

    if (result.errors.length > 0 && !result.data) {
      console.error(`  Discovery "${dq.name}" failed: ${result.errors.map(e => e.message).join('; ')}`);
    } else if (result.errors.length > 0) {
      console.log(`  Discovery "${dq.name}": OK (${result.elapsed}ms) (partial)`);
    } else {
      console.log(`  Discovery "${dq.name}": OK (${result.elapsed}ms)`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  timing.elapsed = Math.round(performance.now() - timing.start);
  console.log(`  Context populated: ${Object.keys(context.data).length} keys (${timing.elapsed}ms)`);
  return timing.elapsed;
}

// ─── Single-source execution ────────────────────────────────────────────────

async function runSource(source) {
  const graphqlDir = SOURCE_DIRS[source];
  if (!graphqlDir || !existsSync(graphqlDir)) {
    console.error(`ERROR: GraphQL dir not found for "${source}": ${graphqlDir}`);
    return [];
  }

  console.log(`\n================================================================`);
  console.log(` Benchmarking: ${source}`);
  console.log(`================================================================`);
  console.log(`GraphQL dir: ${graphqlDir}`);

  console.log('\nBuilding fragment map...');
  const fragmentMap = buildFragmentMap(graphqlDir);
  console.log(`  ${fragmentMap.size} fragments found`);

  console.log('\nScanning operations...');
  const files = findGraphqlFiles(graphqlDir);
  const allOps = [];
  for (const f of files) {
    const ops = parseOperations(f);
    allOps.push(...ops);
  }
  console.log(`  ${allOps.length} operations in ${files.length} files`);

  // Discovery
  const context = new DiscoveryContext();
  await runDiscovery(context);

  // Classify
  const classified = allOps.map(op => ({
    op,
    classification: classifyOperation(op, context),
  }));

  const executableOps = classified.filter(c =>
    c.classification.phase === 'phase1-no-vars' || c.classification.phase === 'phase2-resolvable'
  );
  const skippedOps = classified.filter(c => c.classification.phase === 'skipped');

  console.log(`\n  Executable: ${executableOps.length}, Skipped: ${skippedOps.length}`);

  // Execute queries (no retry — record raw timings)
  const results = [];
  let successCount = 0;
  let errorCount = 0;

  for (const { op, classification } of executableOps) {
    const operationOnly = extractOperationDef(op.rawText, op.name);
    const queryWithFragments = resolveFragments(operationOnly, fragmentMap);
    const variables = classification.variables || null;

    const result = await gqlFetch(queryWithFragments, variables, op.name);

    if (result.httpStatus === 401) {
      console.error(`\nFATAL: 401 Unauthorized on "${op.name}". Token expired.`);
      process.exit(1);
    }

    const hasData = result.data && Object.keys(result.data).length > 0;
    const hasErrors = result.errors.length > 0;

    let status;
    if (hasData && !hasErrors) status = 'success';
    else if (hasData && hasErrors) status = 'partial';
    else status = 'error';

    const key = `${source}::${op.name}`;
    const icon = status === 'success' ? '+' : status === 'partial' ? '~' : 'x';
    console.log(`  [${icon}] ${op.name} (${result.elapsed}ms)`);

    if (status === 'success' || status === 'partial') successCount++;
    else errorCount++;

    results.push({
      key,
      source,
      query_name: op.name,
      query_file: relative(process.cwd(), op.filePath),
      phase: classification.phase,
      status,
      response_time_ms: result.elapsed,
    });

    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`\n  ${source}: ${successCount} success, ${errorCount} errors`);
  return results;
}

// ─── Baseline management ────────────────────────────────────────────────────

function loadBaseline() {
  if (!existsSync(BASELINE_FILE)) return null;
  try {
    const data = JSON.parse(readFileSync(BASELINE_FILE, 'utf8'));
    if (data.version !== 1) {
      console.error(`WARNING: Unknown baseline version ${data.version}, ignoring.`);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function saveBaseline(results) {
  const queries = {};
  for (const r of results) {
    // Only successful queries enter the baseline
    if (r.status !== 'success') continue;
    queries[r.key] = {
      phase: r.phase,
      response_time_ms: r.response_time_ms,
      status: r.status,
    };
  }

  const times = results
    .filter(r => r.status === 'success')
    .map(r => r.response_time_ms)
    .sort((a, b) => a - b);

  const baseline = {
    version: 1,
    saved_at: new Date().toISOString(),
    endpoint: GQL_ENDPOINT,
    queries,
    aggregate_stats: {
      total_queries: times.length,
      avg_ms: times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0,
      p50_ms: percentile(times, 50),
      p90_ms: percentile(times, 90),
      p95_ms: percentile(times, 95),
      p99_ms: percentile(times, 99),
      min_ms: times[0] || 0,
      max_ms: times[times.length - 1] || 0,
    },
  };

  mkdirSync(BENCH_DIR, { recursive: true });
  writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2));
  return baseline;
}

// ─── Comparison ─────────────────────────────────────────────────────────────

function compareResults(results, baseline) {
  const queryResults = [];
  const regressions = [];
  let okCount = 0;
  let noBaselineCount = 0;
  let errorCount = 0;

  for (const r of results) {
    const baselineEntry = baseline?.queries?.[r.key];

    if (r.status !== 'success') {
      queryResults.push({
        key: r.key,
        source: r.source,
        query_name: r.query_name,
        phase: r.phase,
        baseline_ms: baselineEntry?.response_time_ms ?? null,
        current_ms: r.response_time_ms,
        delta_ms: null,
        ratio: null,
        bench_status: 'ERROR',
      });
      errorCount++;
      continue;
    }

    if (!baselineEntry) {
      queryResults.push({
        key: r.key,
        source: r.source,
        query_name: r.query_name,
        phase: r.phase,
        baseline_ms: null,
        current_ms: r.response_time_ms,
        delta_ms: null,
        ratio: null,
        bench_status: 'NO_BASELINE',
      });
      noBaselineCount++;
      continue;
    }

    const baseMs = baselineEntry.response_time_ms;
    const currMs = r.response_time_ms;
    const delta = currMs - baseMs;
    const ratio = baseMs > 0 ? currMs / baseMs : null;

    const exceedsMultiplier = ratio !== null && ratio > THRESHOLD_MULTIPLIER;
    const exceedsAbsolute = delta > THRESHOLD_ABSOLUTE;
    const isRegression = exceedsMultiplier || exceedsAbsolute;

    const entry = {
      key: r.key,
      source: r.source,
      query_name: r.query_name,
      phase: r.phase,
      baseline_ms: baseMs,
      current_ms: currMs,
      delta_ms: delta,
      ratio: ratio !== null ? Math.round(ratio * 100) / 100 : null,
      bench_status: isRegression ? 'REGRESSION' : 'OK',
    };

    queryResults.push(entry);

    if (isRegression) {
      const reasons = [];
      if (exceedsMultiplier) reasons.push(`${entry.ratio}x baseline (threshold: ${THRESHOLD_MULTIPLIER}x)`);
      if (exceedsAbsolute) reasons.push(`+${delta}ms (threshold: ${THRESHOLD_ABSOLUTE}ms)`);
      regressions.push({ ...entry, reasons });
    } else {
      okCount++;
    }
  }

  return {
    queryResults,
    summary: {
      total: results.length,
      ok: okCount,
      regressions: regressions.length,
      no_baseline: noBaselineCount,
      errors: errorCount,
      threshold_multiplier: THRESHOLD_MULTIPLIER,
      threshold_absolute_ms: THRESHOLD_ABSOLUTE,
    },
    regressions,
  };
}

function saveReport(comparison) {
  const report = {
    generated_at: new Date().toISOString(),
    endpoint: GQL_ENDPOINT,
    ...comparison,
  };

  mkdirSync(BENCH_DIR, { recursive: true });
  writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  return report;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nGQL Performance Benchmark Runner');
  console.log(`Endpoint: ${GQL_ENDPOINT}`);
  console.log(`Mode: ${SAVE_BASELINE ? 'save-baseline' : 'compare'}`);
  if (!SAVE_BASELINE) {
    console.log(`Thresholds: multiplier=${THRESHOLD_MULTIPLIER}x, absolute=${THRESHOLD_ABSOLUTE}ms`);
  }

  mkdirSync(BENCH_DIR, { recursive: true });

  // Determine which sources to run
  const sources = args.source === 'both'
    ? ['test-suites', 'client-web']
    : [args.source];

  // Execute queries for each source
  const allResults = [];
  for (const source of sources) {
    const results = await runSource(source);
    allResults.push(...results);
  }

  if (allResults.length === 0) {
    console.error('\nNo queries were executed.');
    process.exit(1);
  }

  // Save baseline mode
  if (SAVE_BASELINE) {
    const baseline = saveBaseline(allResults);
    const successCount = Object.keys(baseline.queries).length;
    console.log(`\n================================================================`);
    console.log(` Baseline Saved`);
    console.log(`================================================================`);
    console.log(`  File: ${BASELINE_FILE}`);
    console.log(`  Queries: ${successCount}`);
    console.log(`  Avg: ${baseline.aggregate_stats.avg_ms}ms`);
    console.log(`  P50: ${baseline.aggregate_stats.p50_ms}ms`);
    console.log(`  P90: ${baseline.aggregate_stats.p90_ms}ms`);
    console.log(`  P95: ${baseline.aggregate_stats.p95_ms}ms`);
    process.exit(0);
  }

  // Compare mode
  const baseline = loadBaseline();
  if (!baseline) {
    console.log('\nWARNING: No baseline found. Run with --save-baseline first.');
    console.log('Saving current run as initial baseline...');
    const bl = saveBaseline(allResults);
    console.log(`  Baseline saved: ${Object.keys(bl.queries).length} queries`);
    console.log(`  File: ${BASELINE_FILE}`);
    process.exit(0);
  }

  const comparison = compareResults(allResults, baseline);
  const report = saveReport(comparison);

  // Print results
  console.log(`\n================================================================`);
  console.log(` Benchmark Results`);
  console.log(`================================================================`);
  console.log(`  Total queries: ${comparison.summary.total}`);
  console.log(`  OK: ${comparison.summary.ok}`);
  console.log(`  Regressions: ${comparison.summary.regressions}`);
  console.log(`  No baseline: ${comparison.summary.no_baseline}`);
  console.log(`  Errors: ${comparison.summary.errors}`);

  if (comparison.regressions.length > 0) {
    console.log(`\n  Regressions:`);
    for (const reg of comparison.regressions) {
      console.log(`    ${reg.query_name} (${reg.source}): ${reg.baseline_ms}ms -> ${reg.current_ms}ms (${reg.reasons.join(', ')})`);
    }
  }

  console.log(`\n  Report: ${REPORT_FILE}`);
  console.log(`  Baseline: ${BASELINE_FILE} (saved ${baseline.saved_at})`);

  if (comparison.summary.regressions > 0) {
    process.exit(2);
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
