import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse, parseAllDocuments } from 'yaml';
import { artifact, loadManifest, prerequisite } from './harness.mjs';

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

test('US4-AS3: all seven rendered overlays have exact dedicated MCP configuration and policies', () => {
  const manifest = loadManifest(false);
  const expected = [
    'infrastructure-operations/acceptance',
    'infrastructure-operations/production',
    'infrastructure-operations/acceptance-v3',
    'infrastructure-operations/production-v3',
    'dev-orchestration/dev',
    'dev-orchestration/test',
    'dev-orchestration/sandbox',
  ];
  prerequisite(
    Array.isArray(manifest.overlays),
    'all seven hashed overlay renders required'
  );
  assert.deepEqual(
    manifest.overlays.map(item => item.id).sort(),
    expected.sort()
  );
  for (const overlay of manifest.overlays) {
    const docs = parseAllDocuments(
      artifact(manifest, overlay.render).toString()
    )
      .map(doc => {
        assert.equal(doc.errors.length, 0);
        return doc.toJSON();
      })
      .filter(Boolean);
    const one = (kind, name) => {
      const found = docs.filter(
        doc => doc.kind === kind && doc.metadata.name === name
      );
      assert.equal(found.length, 1, `${overlay.id}: ${kind}/${name}`);
      return found[0];
    };
    const dedicated = one('Deployment', 'alkemio-server-mcp-deployment');
    assert.equal(dedicated.spec.replicas, 1);
    assert.deepEqual(dedicated.spec.selector.matchLabels, {
      app: 'alkemio-server-mcp',
    });
    assert.equal(
      dedicated.spec.template.metadata.labels.app,
      'alkemio-server-mcp'
    );
    assert.deepEqual(
      one('Service', 'alkemio-server-mcp-service').spec.selector,
      { app: 'alkemio-server-mcp' }
    );
    const container = dedicated.spec.template.spec.containers.find(
      item => item.name === 'alkemio-server-mcp'
    );
    assert.ok(container);
    prerequisite(
      overlay.imageProvenance?.image &&
        /^sha256:[a-f\d]{64}$/.test(overlay.imageProvenance.digest ?? '') &&
        overlay.imageProvenance.releasedSource,
      'actual released image provenance required'
    );
    assert.equal(container.image, overlay.imageProvenance.image);
    const env = Object.fromEntries(
      (container.env ?? []).map(item => [item.name, item.value])
    );
    assert.equal(env.MCP_ENABLED, 'true');
    prerequisite(
      overlay.stage === 'foundation-disabled' ||
        overlay.stage === 'measured-feature',
      'explicit rollout stage required'
    );
    assert.equal(
      env.MCP_WHITEBOARD_EXECUTOR_ENABLED,
      overlay.stage === 'measured-feature' ? 'true' : 'false'
    );
    prerequisite(
      overlay.expectedResources,
      'exact reviewed resource requests/limits required'
    );
    assert.deepEqual(container.resources, overlay.expectedResources);
    if (overlay.stage === 'foundation-disabled') {
      prerequisite(
        overlay.pendingFeatureImage === true &&
          overlay.pendingCapacity === true,
        'foundation must retain explicit image/capacity rollout dependencies'
      );
      for (const key of Object.keys(env).filter(
        key =>
          key.startsWith('MCP_WHITEBOARD_EXECUTOR_') &&
          key !== 'MCP_WHITEBOARD_EXECUTOR_ENABLED'
      ))
        assert.fail(`Unmeasured foundation setting: ${key}`);
    } else {
      prerequisite(
        manifest.observations?.capacity && manifest.producer?.humanPublished,
        'enablement requires capacity evidence and published producer'
      );
      for (const suffix of [
        'MAX_CONCURRENT_CHILDREN',
        'MAX_CONCURRENT_CHILDREN_PER_ACTOR',
        'HEAP_MB',
        'DEADLINE_MS',
      ]) {
        const key = `MCP_WHITEBOARD_EXECUTOR_${suffix}`;
        prerequisite(overlay.executor?.[key], `measured ${key} required`);
        assert.equal(env[key], String(overlay.executor[key]));
        assert.ok(
          Number.isSafeInteger(Number(env[key])) && Number(env[key]) > 0
        );
      }
      assert.ok(
        Number(env.MCP_WHITEBOARD_EXECUTOR_MAX_CONCURRENT_CHILDREN) >=
          (overlay.id.includes('production') ? 4 : 2)
      );
      assert.ok(
        container.resources.limits.memory && container.resources.limits.cpu
      );
    }
    for (const doc of docs.filter(item => item.kind === 'ConfigMap')) {
      assert.ok(
        !Object.keys(doc.data ?? {}).some(key =>
          key.startsWith('MCP_WHITEBOARD_EXECUTOR_')
        ),
        'executor configuration must not leak into shared envFrom'
      );
    }
    const api = one('Deployment', 'alkemio-server-deployment');
    for (const item of api.spec.template.spec.containers) {
      if (item.name !== 'alkemio-server') continue;
      assert.equal(item.image, container.image);
      assert.equal(
        item.env.find(value => value.name === 'MCP_WHITEBOARD_EXECUTOR_ENABLED')
          ?.value,
        'false'
      );
    }
    for (const doc of docs) {
      const pod =
        doc.spec?.template?.spec ?? doc.spec?.jobTemplate?.spec?.template?.spec;
      if (!pod) continue;
      for (const item of [
        ...(pod.containers ?? []),
        ...(pod.initContainers ?? []),
      ]) {
        if (/alkemio\/server[:@]/.test(item.image ?? ''))
          assert.equal(
            item.image,
            container.image,
            'API/migration/auth-reset/MCP release pins must agree'
          );
        if (doc !== dedicated)
          assert.ok(
            !(item.env ?? []).some(
              value =>
                value.name === 'MCP_WHITEBOARD_EXECUTOR_ENABLED' &&
                value.value === 'true'
            )
          );
      }
    }
    if (overlay.id.startsWith('infrastructure-operations/')) {
      for (const [target, port] of [
        ['file-service', '4003'],
        ['collaboration-service', '4006'],
      ]) {
        const policy = one(
          'CiliumNetworkPolicy',
          `allow-traefik-ingress-${target}`
        );
        assert.deepEqual(policy.spec.endpointSelector.matchLabels, {
          app: `alkemio-${target}`,
        });
        assert.ok(
          policy.spec.ingress.some(
            rule =>
              rule.fromEndpoints?.some(
                selector => selector.matchLabels?.app === 'alkemio-server-mcp'
              ) &&
              rule.toPorts?.some(group =>
                group.ports.some(
                  item => item.port === port && item.protocol === 'TCP'
                )
              )
          )
        );
      }
      const egress = one(
        'CiliumNetworkPolicy',
        'allow-app-fleet-egress-shared-services'
      );
      assert.ok(
        egress.spec.endpointSelector.matchExpressions.some(
          expression =>
            expression.key === 'app' &&
            expression.operator === 'In' &&
            expression.values.includes('alkemio-server-mcp')
        )
      );
      for (const [port, target] of [
        ['4003', 'alkemio-file-service'],
        ['4006', 'alkemio-collaboration-service'],
      ])
        assert.ok(
          egress.spec.egress.some(
            rule =>
              rule.toEndpoints?.some(
                selector => selector.matchLabels?.app === target
              ) &&
              rule.toPorts?.some(group =>
                group.ports.some(
                  item => item.port === port && item.protocol === 'TCP'
                )
              )
          )
        );
    } else {
      const policy = one(
        'NetworkPolicy',
        'alkemio-collaboration-service-ingress'
      );
      assert.deepEqual(policy.spec.podSelector.matchLabels, {
        app: 'alkemio-collaboration-service',
      });
      assert.ok(
        policy.spec.ingress.some(
          rule =>
            rule.from?.some(
              peer =>
                peer.podSelector?.matchLabels?.app === 'alkemio-server-mcp'
            ) &&
            rule.ports?.some(
              item => item.port === 4006 && item.protocol === 'TCP'
            )
        )
      );
    }
  }
});
