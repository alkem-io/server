#!/usr/bin/env node
/**
 * Live GraphQL Execution Runner
 *
 * Executes GraphQL operations against a running Alkemio server to catch
 * runtime errors that AST-only validation misses: resolver crashes, auth
 * failures, missing service dependencies.
 *
 * Three-phase approach:
 *   Phase 0 - Discovery: hand-crafted queries to populate context (IDs)
 *   Phase 1 - Variable-free queries: execute queries needing no variables
 *   Phase 2 - Parameterized queries: resolve variables from context, execute
 *
 * Usage: node live-runner.mjs --source test-suites|client-web
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
  buildPerformanceData,
} from './gql-runner-lib.mjs';

// ─── CLI args ───────────────────────────────────────────────────────────────
const { values: args } = parseArgs({
  options: {
    source: { type: 'string' },
    'env-file': { type: 'string', default: '' },
  },
});

if (!args.source || !['test-suites', 'client-web'].includes(args.source)) {
  console.error('Usage: node live-runner.mjs --source test-suites|client-web');
  process.exit(1);
}

// ─── Configuration ──────────────────────────────────────────────────────────
const SCRIPT_DIR = new URL('.', import.meta.url).pathname;
const PROJECT_DIR = join(SCRIPT_DIR, '..', '..');
const PIPELINE_DIR = join(PROJECT_DIR, '.claude', 'pipeline');

const envFile = args['env-file'] || join(PIPELINE_DIR, '.env');
const env = loadEnvFile(envFile);

const GQL_ENDPOINT = env.GRAPHQL_NON_INTERACTIVE_ENDPOINT
  || 'http://localhost:3000/api/private/non-interactive/graphql';

const TOKEN_FILE = join(PIPELINE_DIR, '.session-token');
const SESSION_TOKEN = readFileSync(TOKEN_FILE, 'utf8').trim();

const SOURCE = args.source;
const RESULTS_DIR = join(PIPELINE_DIR, 'live-results', SOURCE);
const SUMMARY_FILE = join(PIPELINE_DIR, 'live-results', '_summary.json');

// Source directories from env
const SOURCE_DIRS = {
  'test-suites': env.TEST_SUITES_GRAPHQL_DIR || '',
  'client-web': env.CLIENT_WEB_GRAPHQL_DIR || '',
};

const GRAPHQL_DIR = SOURCE_DIRS[SOURCE];
if (!GRAPHQL_DIR || !existsSync(GRAPHQL_DIR)) {
  console.error(`ERROR: GraphQL dir not found: ${GRAPHQL_DIR}`);
  process.exit(1);
}

const REQUEST_DELAY_MS = 100;
const REQUEST_TIMEOUT_MS = 15_000;

// ─── Network helpers (close over module-level config) ───────────────────────

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

/**
 * Log errors to console, deduplicating repeated messages and capping output.
 */
const MAX_ERRORS_SHOWN = 5;
function logErrors(errors) {
  const seen = new Map();
  for (const e of errors) {
    const count = seen.get(e.message) || 0;
    seen.set(e.message, count + 1);
  }
  let shown = 0;
  for (const [msg, count] of seen) {
    if (shown >= MAX_ERRORS_SHOWN) {
      const remaining = seen.size - shown;
      if (remaining > 0) console.log(`      ... and ${remaining} more unique error(s)`);
      break;
    }
    const suffix = count > 1 ? ` (x${count})` : '';
    console.log(`      Error: ${msg}${suffix}`);
    shown++;
  }
}

// ─── Phase 0: Discovery ────────────────────────────────────────────────────

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
      console.log(`  Discovery "${dq.name}": OK (${result.elapsed}ms) (partial — some fields had auth errors)`);
    } else {
      console.log(`  Discovery "${dq.name}": OK (${result.elapsed}ms)`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  timing.elapsed = Math.round(performance.now() - timing.start);
  console.log(`  Context populated: ${Object.keys(context.data).length} keys (${timing.elapsed}ms)`);
  console.log(`  Keys: ${Object.keys(context.data).join(', ')}`);
  return timing.elapsed;
}

// ─── Execution ──────────────────────────────────────────────────────────────

const RETRY_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

async function executeOperation(op, classification, fragmentMap) {
  const operationOnly = extractOperationDef(op.rawText, op.name);
  const queryWithFragments = resolveFragments(operationOnly, fragmentMap);

  const variables = classification.variables || null;
  let result = await gqlFetch(queryWithFragments, variables, op.name);

  const isTimeout = (r) => r.httpStatus === 0 && r.errors.some(e => e.message === 'Request timeout');
  let retries = 0;
  while (isTimeout(result) && retries < MAX_RETRIES) {
    retries++;
    const retryTimeoutMs = RETRY_TIMEOUT_MS * retries;
    console.log(`      Retrying "${op.name}" (attempt ${retries + 1}, timeout ${retryTimeoutMs / 1000}s)...`);
    await sleep(REQUEST_DELAY_MS);
    result = await gqlFetchWithTimeout(queryWithFragments, variables, op.name, retryTimeoutMs);
  }

  if (result.httpStatus === 401) {
    console.error(`\nFATAL: 401 Unauthorized on "${op.name}". Token expired.`);
    process.exit(1);
  }

  const hasData = result.data && Object.keys(result.data).length > 0;
  const hasErrors = result.errors.length > 0;

  let status;
  if (hasData && !hasErrors) {
    status = 'success';
  } else if (hasData && hasErrors) {
    status = 'partial';
  } else {
    status = 'error';
  }

  return {
    source: SOURCE,
    query_name: op.name,
    query_file: relative(process.cwd(), op.filePath),
    phase: classification.phase,
    status,
    skip_reason: null,
    variables_used: variables || {},
    http_status: result.httpStatus,
    gql_errors: result.errors.map(e => ({
      message: e.message,
      path: e.path || [],
      extensions: e.extensions || {},
    })),
    data_keys: hasData ? Object.keys(result.data) : [],
    response_time_ms: result.elapsed,
    retries,
    timestamp: new Date().toISOString(),
  };
}

function buildSkippedResult(op, classification) {
  return {
    source: SOURCE,
    query_name: op.name,
    query_file: relative(process.cwd(), op.filePath),
    phase: classification.phase,
    status: 'skipped',
    skip_reason: classification.reason,
    variables_used: {},
    http_status: null,
    gql_errors: [],
    data_keys: [],
    response_time_ms: 0,
    timestamp: new Date().toISOString(),
  };
}

// ─── Summary ────────────────────────────────────────────────────────────────

function updateSummary(results, discoveryMs, phase1Ms, phase2Ms) {
  let existing = { sources: {}, aggregate: {}, discovery: {}, timing: {}, errors: {} };
  if (existsSync(SUMMARY_FILE)) {
    try { existing = JSON.parse(readFileSync(SUMMARY_FILE, 'utf8')); } catch {}
  }

  const counts = {
    total: results.length,
    executed: 0,
    success: 0,
    partial: 0,
    error: 0,
    skipped_mutation: 0,
    skipped_subscription: 0,
    skipped_complex_vars: 0,
  };

  const sourceErrors = [];

  for (const r of results) {
    if (r.status === 'success') { counts.executed++; counts.success++; }
    else if (r.status === 'partial') { counts.executed++; counts.partial++; }
    else if (r.status === 'error') { counts.executed++; counts.error++; }
    else if (r.status === 'skipped') {
      if (r.skip_reason?.includes('mutation')) counts.skipped_mutation++;
      else if (r.skip_reason?.includes('subscription')) counts.skipped_subscription++;
      else counts.skipped_complex_vars++;
    }

    if ((r.status === 'error' || r.status === 'partial') && r.gql_errors?.length > 0) {
      const seen = new Map();
      for (const e of r.gql_errors) {
        const msg = e.message;
        const code = e.extensions?.code || null;
        const path = e.path?.join('.') || null;
        const key = `${msg}|${code}`;
        if (!seen.has(key)) {
          seen.set(key, { message: msg, code, path, count: 1 });
        } else {
          seen.get(key).count++;
        }
      }
      sourceErrors.push({
        query_name: r.query_name,
        query_file: r.query_file,
        phase: r.phase,
        status: r.status,
        http_status: r.http_status,
        retries: r.retries || 0,
        errors: [...seen.values()],
      });
    }
  }

  existing.sources = existing.sources || {};
  existing.sources[SOURCE] = counts;

  existing.errors = existing.errors || {};
  existing.errors[SOURCE] = sourceErrors;

  const agg = { total: 0, executed: 0, success: 0, partial: 0, error: 0, skipped: 0 };
  for (const src of Object.values(existing.sources)) {
    agg.total += src.total;
    agg.executed += src.executed;
    agg.success += src.success;
    agg.partial += (src.partial || 0);
    agg.error += src.error;
    agg.skipped += src.skipped_mutation + src.skipped_subscription + src.skipped_complex_vars;
  }
  existing.aggregate = agg;

  existing.timing = existing.timing || {};
  existing.timing[SOURCE] = {
    discovery_ms: discoveryMs,
    phase1_ms: phase1Ms,
    phase2_ms: phase2Ms,
    total_ms: discoveryMs + phase1Ms + phase2Ms,
  };

  existing.performance = existing.performance || {};
  existing.performance[SOURCE] = buildPerformanceData(results);

  const allPerf = [];
  for (const [src, perf] of Object.entries(existing.performance)) {
    if (perf?.queries) {
      allPerf.push(...perf.queries.map(q => ({ ...q, source: src })));
    }
  }
  if (allPerf.length > 0) {
    const allTimes = allPerf.map(q => q.response_time_ms).sort((a, b) => a - b);
    existing.performance._aggregate = {
      total_queries: allTimes.length,
      avg_ms: Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length),
      min_ms: allTimes[0],
      max_ms: allTimes[allTimes.length - 1],
      p50_ms: percentile(allTimes, 50),
      p90_ms: percentile(allTimes, 90),
      p95_ms: percentile(allTimes, 95),
      p99_ms: percentile(allTimes, 99),
      slowest: allPerf
        .sort((a, b) => b.response_time_ms - a.response_time_ms)
        .slice(0, 10)
        .map(q => ({ query: q.query_name, source: q.source, ms: q.response_time_ms, status: q.status })),
    };
  }

  existing.timestamp = new Date().toISOString();

  writeFileSync(SUMMARY_FILE, JSON.stringify(existing, null, 2));
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nLive GQL Runner — source: ${SOURCE}`);
  console.log(`Endpoint: ${GQL_ENDPOINT}`);
  console.log(`GraphQL dir: ${GRAPHQL_DIR}`);

  const PHASE1_DIR = join(RESULTS_DIR, 'phase-1');
  const PHASE2_DIR = join(RESULTS_DIR, 'phase-2');
  const SKIPPED_DIR = join(RESULTS_DIR, 'skipped');
  for (const dir of [PHASE1_DIR, PHASE2_DIR, SKIPPED_DIR]) {
    mkdirSync(dir, { recursive: true });
  }

  console.log('\nBuilding fragment map...');
  const fragmentMap = buildFragmentMap(GRAPHQL_DIR);
  console.log(`  ${fragmentMap.size} fragments found`);

  console.log('\nScanning operations...');
  const files = findGraphqlFiles(GRAPHQL_DIR);
  const allOps = [];
  for (const f of files) {
    const ops = parseOperations(f);
    allOps.push(...ops);
  }
  console.log(`  ${allOps.length} operations in ${files.length} files`);

  const context = new DiscoveryContext();
  const discoveryMs = await runDiscovery(context);

  const classified = allOps.map(op => ({
    op,
    classification: classifyOperation(op, context),
  }));

  const phase1Ops = classified.filter(c => c.classification.phase === 'phase1-no-vars');
  const phase2Ops = classified.filter(c => c.classification.phase === 'phase2-resolvable');
  const skippedOps = classified.filter(c => c.classification.phase === 'skipped');

  console.log(`\nClassification:`);
  console.log(`  Phase 1 (no vars): ${phase1Ops.length}`);
  console.log(`  Phase 2 (resolvable): ${phase2Ops.length}`);
  console.log(`  Skipped: ${skippedOps.length}`);

  const allResults = [];

  for (const { op, classification } of skippedOps) {
    const result = buildSkippedResult(op, classification);
    allResults.push(result);
    writeFileSync(join(SKIPPED_DIR, `${op.name}.json`), JSON.stringify(result, null, 2));
  }

  console.log('\n=== Phase 1: Variable-free queries ===');
  const phase1Start = performance.now();
  let phase1Success = 0;
  let phase1Error = 0;

  for (const { op, classification } of phase1Ops) {
    const result = await executeOperation(op, classification, fragmentMap);
    allResults.push(result);
    writeFileSync(join(PHASE1_DIR, `${op.name}.json`), JSON.stringify(result, null, 2));

    const icon = result.status === 'success' ? '+' : result.status === 'partial' ? '~' : 'x';
    const retryStr = result.retries > 0 ? ` [retried ${result.retries}x]` : '';
    console.log(`  [${icon}] ${op.name} (${result.response_time_ms}ms)${retryStr}`);
    if (result.status === 'error' || result.status === 'partial') {
      phase1Error++;
      logErrors(result.gql_errors);
    } else {
      phase1Success++;
    }

    await sleep(REQUEST_DELAY_MS);
  }

  const phase1Ms = Math.round(performance.now() - phase1Start);
  console.log(`  Phase 1 done: ${phase1Success} success, ${phase1Error} errors (${phase1Ms}ms)`);

  console.log('\n=== Phase 2: Parameterized queries ===');
  const phase2Start = performance.now();
  let phase2Success = 0;
  let phase2Error = 0;

  for (const { op, classification } of phase2Ops) {
    const result = await executeOperation(op, classification, fragmentMap);
    allResults.push(result);
    writeFileSync(join(PHASE2_DIR, `${op.name}.json`), JSON.stringify(result, null, 2));

    const icon = result.status === 'success' ? '+' : result.status === 'partial' ? '~' : 'x';
    const varsStr = Object.keys(classification.variables || {}).join(', ');
    const retryStr = result.retries > 0 ? ` [retried ${result.retries}x]` : '';
    console.log(`  [${icon}] ${op.name} (${result.response_time_ms}ms) vars: {${varsStr}}${retryStr}`);
    if (result.status === 'error' || result.status === 'partial') {
      phase2Error++;
      logErrors(result.gql_errors);
    } else {
      phase2Success++;
    }

    await sleep(REQUEST_DELAY_MS);
  }

  const phase2Ms = Math.round(performance.now() - phase2Start);
  console.log(`  Phase 2 done: ${phase2Success} success, ${phase2Error} errors (${phase2Ms}ms)`);

  updateSummary(allResults, discoveryMs, phase1Ms, phase2Ms);

  const totalExecuted = phase1Success + phase1Error + phase2Success + phase2Error;
  const totalSuccess = phase1Success + phase2Success;
  const totalErrors = phase1Error + phase2Error;

  console.log(`\n=== Summary (${SOURCE}) ===`);
  console.log(`  Total operations: ${allOps.length}`);
  console.log(`  Executed: ${totalExecuted} (${totalSuccess} success, ${totalErrors} errors)`);
  console.log(`  Skipped: ${skippedOps.length}`);
  console.log(`  Total time: ${discoveryMs + phase1Ms + phase2Ms}ms`);
  console.log(`  Results: ${RESULTS_DIR}`);
  console.log(`  Summary: ${SUMMARY_FILE}`);

  if (totalErrors > 0) {
    process.exit(2);
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
