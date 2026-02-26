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

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'node:fs';
import { join, basename, relative } from 'node:path';
import { parseArgs } from 'node:util';

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

// ─── Discovery queries ─────────────────────────────────────────────────────
const DISCOVERY_QUERIES = [
  {
    name: 'me',
    query: `query {
      me {
        id
        user { id }
        mySpaces(limit:3) {
          space {
            id
            nameID
            level
            collaboration { id calloutsSet { id callouts(limit:1) { id } } }
            community { id roleSet { id } }
            account { id }
            subspaces {
              id
              nameID
              level
              subspaces {
                id
                nameID
                level
              }
            }
          }
        }
      }
    }`,
  },
  {
    name: 'users',
    query: 'query { users(limit:5) { id nameID } }',
  },
  {
    name: 'organizations',
    query: 'query { organizations(limit:5) { id nameID } }',
  },
  {
    name: 'platform',
    query: `query {
      platform {
        id
        templatesManager { id templatesSet { id } }
        configuration { authentication { providers { name enabled } } }
      }
    }`,
  },
  {
    name: 'accounts',
    query: 'query { accounts { id } }',
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Strip single-line GraphQL comments (# to end of line).
 * This prevents regex-based parsers from matching keywords inside comments
 * (e.g. a commented-out `# fragment Foo on Bar {` or `# query shouldn't`).
 */
function stripGraphQLComments(source) {
  return source.replace(/#[^\n]*/g, '');
}

function loadEnvFile(path) {
  const result = {};
  if (!existsSync(path)) return result;
  const lines = readFileSync(path, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1);
    }
    // Expand ${VAR} references
    val = val.replace(/\$\{(\w+)\}/g, (_, k) => result[k] || process.env[k] || '');
    result[key] = val;
  }
  return result;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
  // Deduplicate by message
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

// ─── Fragment resolution ────────────────────────────────────────────────────

/**
 * Build a map of fragmentName -> fragmentDefinition from all .graphql files
 * in the source directory.
 */
function buildFragmentMap(dir) {
  const fragments = new Map();
  const files = findGraphqlFiles(dir);
  const fragmentRegex = /fragment\s+(\w+)\s+on\s+\w+\s*\{/g;

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    // Strip comments so we don't match fragment definitions inside comments
    // (e.g. a fully commented-out `# fragment Foo on Bar { ... }`)
    const stripped = stripGraphQLComments(content);
    let match;
    fragmentRegex.lastIndex = 0;
    while ((match = fragmentRegex.exec(stripped)) !== null) {
      const name = match[1];
      if (!fragments.has(name)) {
        // Store stripped content so extractFragmentDef brace-matching
        // is not confused by braces inside comments
        fragments.set(name, stripped);
      }
    }
  }
  return fragments;
}

/**
 * Find all fragment names already defined in the operation text.
 */
function findDefinedFragments(text) {
  const defined = new Set();
  const defRegex = /fragment\s+(\w+)\s+on\s+\w+/g;
  let match;
  while ((match = defRegex.exec(text)) !== null) {
    defined.add(match[1]);
  }
  return defined;
}

/**
 * Given an operation string, find all ...FragmentName spreads and recursively
 * resolve them from the fragment map. Returns the operation + all needed fragments.
 * Deduplicates: fragments already defined in operationText are not appended again.
 */
function resolveFragments(operationText, fragmentMap) {
  const alreadyDefined = findDefinedFragments(operationText);
  const needed = new Set();
  const spreadRegex = /\.\.\.(\w+)/g;

  function collect(text) {
    let match;
    spreadRegex.lastIndex = 0;
    while ((match = spreadRegex.exec(text)) !== null) {
      const name = match[1];
      // Skip inline spreads (they follow `on TypeName`)
      if (name === 'on') continue;
      if (!needed.has(name) && !alreadyDefined.has(name) && fragmentMap.has(name)) {
        needed.add(name);
        // Also check fragments used by this fragment (recursive resolution)
        const fragSource = fragmentMap.get(name);
        const fragDef = extractFragmentDef(fragSource, name);
        if (fragDef) {
          alreadyDefined.add(name); // mark as will-be-included
          collect(fragDef);
        }
      }
    }
  }

  collect(operationText);

  if (needed.size === 0) return operationText;

  // Extract just the fragment definitions from the source files
  const fragmentDefs = [];
  for (const name of needed) {
    const source = fragmentMap.get(name);
    const extracted = extractFragmentDef(source, name);
    if (extracted) fragmentDefs.push(extracted);
  }

  return operationText + '\n' + fragmentDefs.join('\n');
}

/**
 * Extract a single fragment definition by name from a file that may contain
 * multiple fragments or a query + fragments.
 */
function extractFragmentDef(source, name) {
  const regex = new RegExp(`fragment\\s+${name}\\s+on\\s+\\w+\\s*\\{`);
  const match = regex.exec(source);
  if (!match) return null;

  let depth = 0;
  let start = match.index;
  for (let i = match.index; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}

// ─── File discovery ─────────────────────────────────────────────────────────

function findGraphqlFiles(dir) {
  const results = [];
  function walk(d) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
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

// ─── Operation parsing ──────────────────────────────────────────────────────

/**
 * Parse a .graphql file to extract all operations (query/mutation/subscription).
 * Handles multiline variable declarations.
 * Returns array of { name, type, variables: [{name, type, required}], rawText }.
 */
function parseOperations(filePath) {
  const content = readFileSync(filePath, 'utf8');
  // Strip comments to avoid matching keywords inside comments
  // (e.g. `# This query shouldn't be needed` matching as operation "shouldn")
  const stripped = stripGraphQLComments(content);
  const ops = [];
  // Match the start of operation definitions (type + name)
  const opStartRegex = /(query|mutation|subscription)\s+(\w+)/g;
  let match;

  while ((match = opStartRegex.exec(stripped)) !== null) {
    const type = match[1];
    const name = match[2];
    let varString = '';

    // Look at what follows the name — could be `(` (vars) or `{` (body) or whitespace
    let pos = match.index + match[0].length;
    // Skip whitespace
    while (pos < stripped.length && /\s/.test(stripped[pos])) pos++;

    if (stripped[pos] === '(') {
      // Extract everything between matching parens (handles multiline)
      let depth = 0;
      const varStart = pos + 1;
      for (let i = pos; i < stripped.length; i++) {
        if (stripped[i] === '(') depth++;
        if (stripped[i] === ')') {
          depth--;
          if (depth === 0) {
            varString = stripped.slice(varStart, i);
            break;
          }
        }
      }
    }

    const variables = parseVariables(varString);
    ops.push({ name, type, variables, filePath, rawText: stripped });
  }

  // Handle anonymous queries (no operation name)
  if (ops.length === 0 && stripped.trim().startsWith('{')) {
    const name = basename(filePath, '.graphql');
    ops.push({ name, type: 'query', variables: [], filePath, rawText: stripped });
  }

  return ops;
}

function parseVariables(varString) {
  if (!varString.trim()) return [];
  const vars = [];
  // Match each $varName: Type pattern — works for both comma and newline separation
  const varRegex = /\$(\w+)\s*:\s*([^,$\n]+)/g;
  let m;
  while ((m = varRegex.exec(varString)) !== null) {
    const name = m[1];
    let type = m[2].trim();
    // Remove default values
    const eqIdx = type.indexOf('=');
    if (eqIdx !== -1) type = type.slice(0, eqIdx).trim();
    const required = type.endsWith('!');
    vars.push({ name, type: type.replace(/!$/, ''), required });
  }
  return vars;
}

// ─── Variable resolution ────────────────────────────────────────────────────

/**
 * The DiscoveryContext holds IDs resolved during Phase 0.
 */
class DiscoveryContext {
  constructor() {
    this.data = {};
  }

  set(key, value) { this.data[key] = value; }
  get(key) { return this.data[key]; }

  /**
   * Try to resolve a variable by matching its name and type to known context.
   * Returns { resolved: true, value } or { resolved: false }.
   */
  resolveVariable(varName, varType) {
    const name = varName.toLowerCase();
    const baseType = varType.replace(/[\[\]!]/g, '');

    // UUID type variables — match by name patterns
    if (baseType === 'UUID') {
      return this._resolveUUID(name);
    }

    // NameID type
    if (baseType === 'NameID') {
      return this._resolveNameID(name);
    }

    // Pagination
    if (baseType === 'Int') {
      if (name === 'first' || name === 'limit' || name === 'take') return { resolved: true, value: 3 };
      // Skip 'last' — providing both first+last is rejected by relay-style pagination
      if (name === 'last') return { resolved: false };
      return { resolved: true, value: 10 };
    }

    if (baseType === 'Float') {
      return { resolved: true, value: 1.0 };
    }

    if (baseType === 'String') {
      if (name.includes('cursor') || name === 'after' || name === 'before') {
        return { resolved: false };
      }
      return { resolved: true, value: '' };
    }

    if (baseType === 'Boolean') {
      return { resolved: true, value: false };
    }

    // Filter inputs — pass empty object (no filtering)
    if (baseType.endsWith('FilterInput')) {
      return { resolved: true, value: {} };
    }

    // Complex Input types — skip
    if (baseType.endsWith('Input')) {
      return { resolved: false };
    }

    // Enum types — cannot guess, skip
    return { resolved: false };
  }

  _resolveUUID(name) {
    // Direct matches
    const directMap = {
      spaceid: 'spaceId',
      userid: 'userId',
      organizationid: 'organizationId',
      orgid: 'organizationId',
      collaborationid: 'collaborationId',
      calloutid: 'calloutId',
      calloutssetid: 'calloutsSetId',
      rolesetid: 'roleSetId',
      accountid: 'accountId',
      platformid: 'platformId',
      templatesmanagerid: 'templatesManagerId',
      templatessetid: 'templatesSetId',
      communityid: 'communityId',
      profileid: 'profileId',
      meuserid: 'meUserId',
      // Level-specific subspace IDs
      parentspaceid: 'spaceL0Id',
    };

    // Exact match
    if (directMap[name]) {
      const val = this.data[directMap[name]];
      if (val) return { resolved: true, value: val };
      // For parentspaceid, fall back to generic spaceId
      if (name === 'parentspaceid') {
        const fallback = this.data.spaceId;
        if (fallback) return { resolved: true, value: fallback };
      }
    }

    // Pattern matching — names ending with known suffixes
    // e.g. $subspaceId -> subspaceL1Id (prefer level-specific), $contributorId -> userId
    const patterns = [
      { suffix: 'spaceid', key: 'spaceId' },
      { suffix: 'subspaceid', key: 'subspaceL1Id', fallback: 'spaceId' },
      { suffix: 'challengeid', key: 'spaceId' },
      { suffix: 'opportunityid', key: 'spaceId' },
      { suffix: 'userid', key: 'userId' },
      { suffix: 'contributorid', key: 'userId' },
      { suffix: 'memberid', key: 'userId' },
      { suffix: 'organizationid', key: 'organizationId' },
      { suffix: 'communityid', key: 'communityId' },
      { suffix: 'collaborationid', key: 'collaborationId' },
      { suffix: 'rolesetid', key: 'roleSetId' },
      { suffix: 'accountid', key: 'accountId' },
      { suffix: 'calloutid', key: 'calloutId' },
      { suffix: 'calloutssetid', key: 'calloutsSetId' },
    ];

    for (const { suffix, key, fallback } of patterns) {
      if (name.endsWith(suffix) || name === suffix) {
        const val = this.data[key];
        if (val) return { resolved: true, value: val };
        // Try fallback key if primary not found
        if (fallback) {
          const fb = this.data[fallback];
          if (fb) return { resolved: true, value: fb };
        }
      }
    }

    // After/before cursors for pagination
    if (name === 'after' || name === 'before') {
      return { resolved: false };
    }

    // Generic $id / $ID — too ambiguous to resolve safely, skip
    return { resolved: false };
  }

  _resolveNameID(name) {
    // Level-specific space nameIDs (e.g. $spaceNameId → L0, $subspaceL1NameId → L1)
    if (name.includes('subspacel2') || name.includes('subspace_l2')) {
      const val = this.data.subspaceL2NameID;
      if (val) return { resolved: true, value: val };
      return { resolved: false };
    }
    if (name.includes('subspacel1') || name.includes('subspace_l1')) {
      const val = this.data.subspaceL1NameID;
      if (val) return { resolved: true, value: val };
      return { resolved: false };
    }
    // $spaceNameId → always resolve to L0 space nameID
    if (name.includes('space') || name === 'nameid') {
      const val = this.data.spaceL0NameID || this.data.spaceNameID;
      if (val) return { resolved: true, value: val };
    }
    if (name.includes('user')) {
      const val = this.data.userNameID;
      if (val) return { resolved: true, value: val };
    }
    if (name.includes('org')) {
      const val = this.data.organizationNameID;
      if (val) return { resolved: true, value: val };
    }
    return { resolved: false };
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

    // Extract what we can, even from partial results with errors
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

function extractDiscoveryIds(queryName, data, context) {
  if (!data) return;

  if (queryName === 'me' && data.me) {
    if (data.me.id) context.set('meId', data.me.id);
    if (data.me.user?.id) context.set('meUserId', data.me.user.id);
    // Extract space data from mySpaces (user has access to these)
    if (Array.isArray(data.me.mySpaces)) {
      for (const entry of data.me.mySpaces) {
        const s = entry?.space;
        if (!s?.id) continue;
        // Store first space as default
        if (!context.get('spaceId')) context.set('spaceId', s.id);
        if (!context.get('spaceNameID') && s.nameID) context.set('spaceNameID', s.nameID);
        if (!context.get('collaborationId') && s.collaboration?.id) context.set('collaborationId', s.collaboration.id);
        if (!context.get('calloutsSetId') && s.collaboration?.calloutsSet?.id) context.set('calloutsSetId', s.collaboration.calloutsSet.id);
        if (!context.get('calloutId') && s.collaboration?.calloutsSet?.callouts?.[0]?.id) {
          context.set('calloutId', s.collaboration.calloutsSet.callouts[0].id);
        }
        if (!context.get('communityId') && s.community?.id) context.set('communityId', s.community.id);
        if (!context.get('roleSetId') && s.community?.roleSet?.id) context.set('roleSetId', s.community.roleSet.id);
        if (!context.get('accountId') && s.account?.id) context.set('accountId', s.account.id);

        // Store per-level space IDs and nameIDs
        const level = s.level; // 'L0', 'L1', 'L2'
        if (level === 'L0') {
          if (!context.get('spaceL0Id')) context.set('spaceL0Id', s.id);
          if (!context.get('spaceL0NameID') && s.nameID) context.set('spaceL0NameID', s.nameID);
        }

        // Extract L1 subspaces
        if (Array.isArray(s.subspaces)) {
          for (const sub of s.subspaces) {
            if (!sub?.id) continue;
            if (sub.level === 'L1') {
              if (!context.get('subspaceL1Id')) context.set('subspaceL1Id', sub.id);
              if (!context.get('subspaceL1NameID') && sub.nameID) context.set('subspaceL1NameID', sub.nameID);
            }
            // Extract L2 subspaces
            if (Array.isArray(sub.subspaces)) {
              for (const sub2 of sub.subspaces) {
                if (!sub2?.id) continue;
                if (sub2.level === 'L2') {
                  if (!context.get('subspaceL2Id')) context.set('subspaceL2Id', sub2.id);
                  if (!context.get('subspaceL2NameID') && sub2.nameID) context.set('subspaceL2NameID', sub2.nameID);
                }
              }
            }
          }
        }
      }
    }
  }

  if (queryName === 'users' && Array.isArray(data.users) && data.users.length > 0) {
    context.set('userId', data.users[0].id);
    if (data.users[0].nameID) context.set('userNameID', data.users[0].nameID);
  }

  if (queryName === 'organizations' && Array.isArray(data.organizations) && data.organizations.length > 0) {
    context.set('organizationId', data.organizations[0].id);
    if (data.organizations[0].nameID) context.set('organizationNameID', data.organizations[0].nameID);
  }

  if (queryName === 'platform' && data.platform) {
    context.set('platformId', data.platform.id);
    if (data.platform.templatesManager?.id) {
      context.set('templatesManagerId', data.platform.templatesManager.id);
    }
    if (data.platform.templatesManager?.templatesSet?.id) {
      context.set('templatesSetId', data.platform.templatesManager.templatesSet.id);
    }
  }

  if (queryName === 'accounts' && Array.isArray(data.accounts) && data.accounts.length > 0) {
    if (!context.get('accountId')) {
      context.set('accountId', data.accounts[0].id);
    }
  }
}

// ─── Classification ─────────────────────────────────────────────────────────

function classifyOperation(op, context) {
  if (op.type === 'subscription') {
    return { phase: 'skipped', reason: 'subscription (WebSocket only)' };
  }
  if (op.type === 'mutation') {
    return { phase: 'skipped', reason: 'mutation (non-idempotent)' };
  }

  // Query with no variables
  if (op.variables.length === 0) {
    return { phase: 'phase1-no-vars', reason: null };
  }

  // Try resolving all required variables
  const resolved = {};
  for (const v of op.variables) {
    const result = context.resolveVariable(v.name, v.type);
    if (result.resolved) {
      resolved[v.name] = result.value;
    } else if (v.required) {
      return { phase: 'skipped', reason: `unresolvable required variable: $${v.name}: ${v.type}` };
    }
    // Optional unresolved vars are simply omitted
  }

  return { phase: 'phase2-resolvable', reason: null, variables: resolved };
}

// ─── Operation extraction ───────────────────────────────────────────────────

/**
 * Extract a single named operation from a file that may contain multiple operations.
 * Returns just the operation definition (type name(vars) { body }).
 */
function extractOperationDef(content, opName) {
  // Find the operation start
  const regex = new RegExp(`(query|mutation|subscription)\\s+${opName}\\b`);
  const match = regex.exec(content);
  if (!match) return content; // fallback to full content

  const start = match.index;

  // Skip past variable declarations to find the opening `{`
  let pos = start + match[0].length;
  // Skip whitespace
  while (pos < content.length && /\s/.test(content[pos])) pos++;
  // Skip variable block if present
  if (content[pos] === '(') {
    let depth = 0;
    for (let i = pos; i < content.length; i++) {
      if (content[i] === '(') depth++;
      if (content[i] === ')') { depth--; if (depth === 0) { pos = i + 1; break; } }
    }
    // Skip whitespace after vars
    while (pos < content.length && /\s/.test(content[pos])) pos++;
  }

  // Now find the matching closing `}` for the operation body
  if (content[pos] !== '{') return content; // unexpected, fallback

  let depth = 0;
  for (let i = pos; i < content.length; i++) {
    if (content[i] === '{') depth++;
    if (content[i] === '}') {
      depth--;
      if (depth === 0) return content.slice(start, i + 1);
    }
  }

  return content; // fallback
}

// ─── Execution ──────────────────────────────────────────────────────────────

const RETRY_TIMEOUT_MS = 30_000; // doubled timeout for retries
const MAX_RETRIES = 2;

async function executeOperation(op, classification, fragmentMap) {
  // Extract just this operation (handles multi-operation files)
  const operationOnly = extractOperationDef(op.rawText, op.name);
  const queryWithFragments = resolveFragments(operationOnly, fragmentMap);

  const variables = classification.variables || null;
  let result = await gqlFetch(queryWithFragments, variables, op.name);

  // Retry on timeout with increasing timeout
  const isTimeout = (r) => r.httpStatus === 0 && r.errors.some(e => e.message === 'Request timeout');
  let retries = 0;
  while (isTimeout(result) && retries < MAX_RETRIES) {
    retries++;
    const retryTimeoutMs = RETRY_TIMEOUT_MS * retries;
    console.log(`      Retrying "${op.name}" (attempt ${retries + 1}, timeout ${retryTimeoutMs / 1000}s)...`);
    await sleep(REQUEST_DELAY_MS);
    result = await gqlFetchWithTimeout(queryWithFragments, variables, op.name, retryTimeoutMs);
  }

  // Halt on 401
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
    status = 'partial'; // data returned but with errors
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

  // Collect error/partial details for this source
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

    // Collect error details for error and partial results
    if ((r.status === 'error' || r.status === 'partial') && r.gql_errors?.length > 0) {
      // Deduplicate errors by message within each operation
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

  // Store error details per source
  existing.errors = existing.errors || {};
  existing.errors[SOURCE] = sourceErrors;

  // Rebuild aggregate
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

  // Performance benchmarks per source
  existing.performance = existing.performance || {};
  existing.performance[SOURCE] = buildPerformanceData(results);

  // Rebuild aggregate performance across all sources
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

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function buildPerformanceData(results) {
  const executed = results.filter(r => r.status !== 'skipped');
  if (executed.length === 0) return { stats: {}, queries: [] };

  const times = executed.map(r => r.response_time_ms).sort((a, b) => a - b);
  const total = times.reduce((a, b) => a + b, 0);

  const stats = {
    total_queries: times.length,
    avg_ms: Math.round(total / times.length),
    min_ms: times[0],
    max_ms: times[times.length - 1],
    median_ms: percentile(times, 50),
    p90_ms: percentile(times, 90),
    p95_ms: percentile(times, 95),
    p99_ms: percentile(times, 99),
    under_100ms: times.filter(t => t < 100).length,
    under_500ms: times.filter(t => t < 500).length,
    under_1000ms: times.filter(t => t < 1000).length,
    over_1000ms: times.filter(t => t >= 1000).length,
    over_5000ms: times.filter(t => t >= 5000).length,
  };

  const queries = executed
    .map(r => ({
      query_name: r.query_name,
      phase: r.phase,
      status: r.status,
      response_time_ms: r.response_time_ms,
      retries: r.retries || 0,
    }))
    .sort((a, b) => b.response_time_ms - a.response_time_ms);

  return { stats, queries };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nLive GQL Runner — source: ${SOURCE}`);
  console.log(`Endpoint: ${GQL_ENDPOINT}`);
  console.log(`GraphQL dir: ${GRAPHQL_DIR}`);

  // Ensure results directories (phase-based layout)
  const PHASE1_DIR = join(RESULTS_DIR, 'phase-1');
  const PHASE2_DIR = join(RESULTS_DIR, 'phase-2');
  const SKIPPED_DIR = join(RESULTS_DIR, 'skipped');
  for (const dir of [PHASE1_DIR, PHASE2_DIR, SKIPPED_DIR]) {
    mkdirSync(dir, { recursive: true });
  }

  // Build fragment map
  console.log('\nBuilding fragment map...');
  const fragmentMap = buildFragmentMap(GRAPHQL_DIR);
  console.log(`  ${fragmentMap.size} fragments found`);

  // Discover all operations
  console.log('\nScanning operations...');
  const files = findGraphqlFiles(GRAPHQL_DIR);
  const allOps = [];
  for (const f of files) {
    const ops = parseOperations(f);
    allOps.push(...ops);
  }
  console.log(`  ${allOps.length} operations in ${files.length} files`);

  // Phase 0: Discovery
  const context = new DiscoveryContext();
  const discoveryMs = await runDiscovery(context);

  // Classify all operations
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

  // Write skipped results
  for (const { op, classification } of skippedOps) {
    const result = buildSkippedResult(op, classification);
    allResults.push(result);
    writeFileSync(join(SKIPPED_DIR, `${op.name}.json`), JSON.stringify(result, null, 2));
  }

  // Phase 1: Variable-free queries
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

  // Phase 2: Parameterized queries
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

  // Summary
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

  // Exit with error if any operations failed
  if (totalErrors > 0) {
    process.exit(2);
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
