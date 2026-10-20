import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const workflow = parse(
  readFileSync(
    join(root, '.github/workflows/build-deploy-k8s-dev-hetzner.yml'),
    'utf8'
  )
);
const image = `registry.fixture/alkemio-server:${'a'.repeat(40)}`;

const runRoll = ({
  present = true,
  query = 0,
  patch = 0,
  rollout = 0,
} = {}) => {
  const directory = mkdtempSync(join(tmpdir(), 'mcp-image-roll-'));
  try {
    const step = workflow.jobs.deploy.steps.find(
      candidate =>
        candidate.name === 'Roll the MCP server to the same image when present'
    );
    assert.equal(
      typeof step?.run,
      'string',
      'dedicated MCP image roll is required'
    );
    const calls = join(directory, 'calls.jsonl');
    writeFileSync(
      join(directory, 'kubectl'),
      `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CALLS, JSON.stringify(args) + '\\n');
if (args.includes('get')) {
  if (process.env.PRESENT === 'true') console.log('deployment.apps/alkemio-server-mcp-deployment');
  process.exit(Number(process.env.QUERY));
}
if (args.includes('patch')) process.exit(Number(process.env.PATCH));
if (args.includes('rollout')) process.exit(Number(process.env.ROLLOUT));
process.exit(99);
`,
      { mode: 0o700 }
    );
    const script = step.run
      .replaceAll('${{ secrets.REGISTRY_LOGIN_SERVER }}', 'registry.fixture')
      .replaceAll('${{ github.sha }}', 'a'.repeat(40));
    const result = spawnSync('bash', ['-e', '-o', 'pipefail', '-c', script], {
      encoding: 'utf8',
      timeout: 5000,
      env: {
        PATH: `${directory}:${dirname(process.execPath)}:/usr/bin:/bin`,
        CALLS: calls,
        PRESENT: String(present),
        QUERY: String(query),
        PATCH: String(patch),
        ROLLOUT: String(rollout),
      },
    });
    return {
      status: result.status,
      stderr: result.stderr,
      calls: readFileSync(calls, 'utf8').trim().split('\n').map(JSON.parse),
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

test('MCP image roll patches the exact container/image/pull secret and checks rollout', () => {
  const result = runRoll();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.calls[0], [
    '-n',
    'default',
    'get',
    'deployment',
    'alkemio-server-mcp-deployment',
    '--ignore-not-found',
    '-o',
    'name',
  ]);
  const patch = result.calls[1];
  assert.deepEqual(patch.slice(0, 6), [
    '-n',
    'default',
    'patch',
    'deployment',
    'alkemio-server-mcp-deployment',
    '-p',
  ]);
  assert.deepEqual(JSON.parse(patch[6]), {
    spec: {
      template: {
        spec: {
          imagePullSecrets: [{ name: 'alkemio-server-secret' }],
          containers: [{ name: 'alkemio-server-mcp', image }],
        },
      },
    },
  });
  assert.deepEqual(result.calls[2], [
    '-n',
    'default',
    'rollout',
    'status',
    'deployment/alkemio-server-mcp-deployment',
    '--timeout=180s',
  ]);
});

test('only a successful confirmed NotFound skips the MCP roll', () => {
  const result = runRoll({ present: false });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.calls.length, 1);
});

test('a failed MCP query does not become a NotFound skip', () => {
  const result = runRoll({ present: false, query: 1 });
  assert.notEqual(result.status, 0);
  assert.equal(result.calls.length, 1);
});

test('a patch failure or deletion after lookup fails the MCP roll', () => {
  const result = runRoll({ patch: 1 });
  assert.notEqual(result.status, 0);
  assert.equal(result.calls.length, 2);
});

test('a failed MCP rollout fails the deployment job', () => {
  assert.notEqual(runRoll({ rollout: 1 }).status, 0);
});
