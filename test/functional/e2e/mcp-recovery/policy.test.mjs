import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { parseAllDocuments } from 'yaml';
import {
  artifact,
  loadManifest,
  prerequisite,
  root,
  sha256,
} from './harness.mjs';

test('US4-AS3/US3-AS1: external matching policy engine applies actual product renders and exercises owned files', () => {
  const manifest = loadManifest();
  prerequisite(
    manifest.observations?.policy,
    'verified HQ policy-engine.mjs external orchestration receipt required; fixture smoke alone is insufficient; no ambient cluster access'
  );
  const evidence = JSON.parse(artifact(manifest, manifest.observations.policy));
  assert.equal(evidence.runId, manifest.runId);
  assert.equal(evidence.clusterName, 'forge-088-mcp-policy');
  assert.equal(evidence.context, 'kind-forge-088-mcp-policy');
  assert.equal(evidence.engine, 'cilium');
  prerequisite(
    evidence.launcher && evidence.launcherLog && evidence.appliedPolicies,
    'existing launcher hash, log and product policy payloads required'
  );
  const launcher = join(
    root,
    '../../_workspace/feat-088-mcp-operational-recovery/specs/088-mcp-operational-recovery/verification/policy-engine.mjs'
  );
  assert.equal(
    sha256(artifact(manifest, evidence.launcher)),
    sha256(readFileSync(launcher))
  );
  assert.ok(artifact(manifest, evidence.launcherLog).length > 0);
  const expected = manifest.overlays;
  prerequisite(
    expected?.length === 7,
    'all seven exact overlay artifacts required'
  );
  for (const overlay of expected) {
    const policies = bytes =>
      parseAllDocuments(bytes.toString())
        .map(doc => {
          assert.equal(doc.errors.length, 0);
          return doc.toJSON();
        })
        .filter(
          doc =>
            doc &&
            [
              'allow-traefik-ingress-file-service',
              'allow-traefik-ingress-collaboration-service',
              'allow-app-fleet-egress-shared-services',
              'alkemio-collaboration-service-ingress',
            ].includes(doc.metadata?.name)
        );
    const intended = policies(artifact(manifest, overlay.render));
    const applied = evidence.appliedPolicies.filter(
      item => item.overlay === overlay.id
    );
    assert.ok(
      applied.length > 0,
      'every overlay must be represented by actual applied policies'
    );
    assert.equal(
      evidence.renderHashes[overlay.id],
      sha256(artifact(manifest, overlay.render))
    );
    for (const payload of applied) {
      assert.ok(artifact(manifest, payload).length > 0);
      assert.equal(payload.originRenderSha256, overlay.render.sha256);
    }
    const actual = applied.flatMap(payload =>
      policies(artifact(manifest, payload))
    );
    const byName = (a, b) => a.metadata.name.localeCompare(b.metadata.name);
    assert.ok(intended.length > 0);
    assert.deepEqual(
      actual.sort(byName),
      intended.sort(byName),
      'applied product policies must exactly match rendered selectors and ports'
    );
  }
  assert.ok(evidence.probes.length >= 4);
  for (const port of [4003, 4006])
    for (const allowed of [true, false]) {
      const probe = evidence.probes.find(
        item => item.port === port && item.allowed === allowed
      );
      assert.ok(
        probe,
        'allow and deny probes required for both dependency ports'
      );
      assert.equal(probe.exitCode === 0, allowed);
      assert.equal(
        probe.sourceApp,
        allowed ? 'alkemio-server-mcp' : 'forge-policy-denied'
      );
      assert.ok(artifact(manifest, probe.log).length > 0);
    }
  prerequisite(
    evidence.fileRoundtrip,
    'target-owned create/upload/read roundtrip through real product services required'
  );
  const roundtrip = JSON.parse(artifact(manifest, evidence.fileRoundtrip));
  assert.equal(roundtrip.runId, manifest.runId);
  assert.equal(roundtrip.actorId, manifest.fixtures.actors.author.id);
  assert.equal(roundtrip.uploadSha256, roundtrip.downloadSha256);
  assert.ok(
    roundtrip.targetBucketId && roundtrip.fileId && roundtrip.durableVersion > 0
  );
  assert.equal(roundtrip.created, true);
  assert.equal(evidence.teardown.remainingContainers, 0);
  assert.equal(evidence.teardown.remainingNetworks, 0);
  assert.equal(evidence.teardown.manifestAttested, true);
});
