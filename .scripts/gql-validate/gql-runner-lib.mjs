/**
 * Shared utilities for GQL runner scripts.
 *
 * Extracted from live-runner.mjs so that bench-runner.mjs (and future tools)
 * can reuse the same parsing, fragment-resolution, classification, and
 * statistics logic without duplication.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

// ─── Discovery queries ─────────────────────────────────────────────────────
export const DISCOVERY_QUERIES = [
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
export function stripGraphQLComments(source) {
  return source.replace(/#[^\n]*/g, '');
}

export function loadEnvFile(path) {
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

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Fragment resolution ────────────────────────────────────────────────────

/**
 * Build a map of fragmentName -> fragmentDefinition from all .graphql files
 * in the source directory.
 */
export function buildFragmentMap(dir) {
  const fragments = new Map();
  const files = findGraphqlFiles(dir);
  const fragmentRegex = /fragment\s+(\w+)\s+on\s+\w+\s*\{/g;

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    // Strip comments so we don't match fragment definitions inside comments
    const stripped = stripGraphQLComments(content);
    let match;
    fragmentRegex.lastIndex = 0;
    while ((match = fragmentRegex.exec(stripped)) !== null) {
      const name = match[1];
      if (!fragments.has(name)) {
        fragments.set(name, stripped);
      }
    }
  }
  return fragments;
}

/**
 * Find all fragment names already defined in the operation text.
 */
export function findDefinedFragments(text) {
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
export function resolveFragments(operationText, fragmentMap) {
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
        const fragSource = fragmentMap.get(name);
        const fragDef = extractFragmentDef(fragSource, name);
        if (fragDef) {
          alreadyDefined.add(name);
          collect(fragDef);
        }
      }
    }
  }

  collect(operationText);

  if (needed.size === 0) return operationText;

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
export function extractFragmentDef(source, name) {
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

export function findGraphqlFiles(dir) {
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
export function parseOperations(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const stripped = stripGraphQLComments(content);
  const ops = [];
  const opStartRegex = /(query|mutation|subscription)\s+(\w+)/g;
  let match;

  while ((match = opStartRegex.exec(stripped)) !== null) {
    const type = match[1];
    const name = match[2];
    let varString = '';

    let pos = match.index + match[0].length;
    while (pos < stripped.length && /\s/.test(stripped[pos])) pos++;

    if (stripped[pos] === '(') {
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

export function parseVariables(varString) {
  if (!varString.trim()) return [];
  const vars = [];
  const varRegex = /\$(\w+)\s*:\s*([^,$\n]+)/g;
  let m;
  while ((m = varRegex.exec(varString)) !== null) {
    const name = m[1];
    let type = m[2].trim();
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
export class DiscoveryContext {
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

    if (baseType === 'UUID') {
      return this._resolveUUID(name);
    }

    if (baseType === 'NameID') {
      return this._resolveNameID(name);
    }

    if (baseType === 'Int') {
      if (name === 'first' || name === 'limit' || name === 'take') return { resolved: true, value: 3 };
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

    if (baseType.endsWith('FilterInput')) {
      return { resolved: true, value: {} };
    }

    if (baseType.endsWith('Input')) {
      return { resolved: false };
    }

    return { resolved: false };
  }

  _resolveUUID(name) {
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
      parentspaceid: 'spaceL0Id',
    };

    if (directMap[name]) {
      const val = this.data[directMap[name]];
      if (val) return { resolved: true, value: val };
      if (name === 'parentspaceid') {
        const fallback = this.data.spaceId;
        if (fallback) return { resolved: true, value: fallback };
      }
    }

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
        if (fallback) {
          const fb = this.data[fallback];
          if (fb) return { resolved: true, value: fb };
        }
      }
    }

    if (name === 'after' || name === 'before') {
      return { resolved: false };
    }

    return { resolved: false };
  }

  _resolveNameID(name) {
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

// ─── Classification ─────────────────────────────────────────────────────────

export function classifyOperation(op, context) {
  if (op.type === 'subscription') {
    return { phase: 'skipped', reason: 'subscription (WebSocket only)' };
  }
  if (op.type === 'mutation') {
    return { phase: 'skipped', reason: 'mutation (non-idempotent)' };
  }

  if (op.variables.length === 0) {
    return { phase: 'phase1-no-vars', reason: null };
  }

  const resolved = {};
  for (const v of op.variables) {
    const result = context.resolveVariable(v.name, v.type);
    if (result.resolved) {
      resolved[v.name] = result.value;
    } else if (v.required) {
      return { phase: 'skipped', reason: `unresolvable required variable: $${v.name}: ${v.type}` };
    }
  }

  return { phase: 'phase2-resolvable', reason: null, variables: resolved };
}

// ─── Discovery ID extraction ────────────────────────────────────────────────

export function extractDiscoveryIds(queryName, data, context) {
  if (!data) return;

  if (queryName === 'me' && data.me) {
    if (data.me.id) context.set('meId', data.me.id);
    if (data.me.user?.id) context.set('meUserId', data.me.user.id);
    if (Array.isArray(data.me.mySpaces)) {
      for (const entry of data.me.mySpaces) {
        const s = entry?.space;
        if (!s?.id) continue;
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

        const level = s.level;
        if (level === 'L0') {
          if (!context.get('spaceL0Id')) context.set('spaceL0Id', s.id);
          if (!context.get('spaceL0NameID') && s.nameID) context.set('spaceL0NameID', s.nameID);
        }

        if (Array.isArray(s.subspaces)) {
          for (const sub of s.subspaces) {
            if (!sub?.id) continue;
            if (sub.level === 'L1') {
              if (!context.get('subspaceL1Id')) context.set('subspaceL1Id', sub.id);
              if (!context.get('subspaceL1NameID') && sub.nameID) context.set('subspaceL1NameID', sub.nameID);
            }
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

// ─── Operation extraction ───────────────────────────────────────────────────

/**
 * Extract a single named operation from a file that may contain multiple operations.
 * Returns just the operation definition (type name(vars) { body }).
 */
export function extractOperationDef(content, opName) {
  const regex = new RegExp(`(query|mutation|subscription)\\s+${opName}\\b`);
  const match = regex.exec(content);
  if (!match) return content;

  const start = match.index;

  let pos = start + match[0].length;
  while (pos < content.length && /\s/.test(content[pos])) pos++;
  if (content[pos] === '(') {
    let depth = 0;
    for (let i = pos; i < content.length; i++) {
      if (content[i] === '(') depth++;
      if (content[i] === ')') { depth--; if (depth === 0) { pos = i + 1; break; } }
    }
    while (pos < content.length && /\s/.test(content[pos])) pos++;
  }

  if (content[pos] !== '{') return content;

  let depth = 0;
  for (let i = pos; i < content.length; i++) {
    if (content[i] === '{') depth++;
    if (content[i] === '}') {
      depth--;
      if (depth === 0) return content.slice(start, i + 1);
    }
  }

  return content;
}

// ─── Statistics ─────────────────────────────────────────────────────────────

export function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export function buildPerformanceData(results) {
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
