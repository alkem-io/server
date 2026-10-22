import assert from 'node:assert/strict';
import test from 'node:test';
import { artifact, loadManifest, prerequisite } from './harness.mjs';

test('US4-AS2: bounded full Nest/cgroup experiment and independent API readiness evidence', () => {
  const manifest = loadManifest();
  prerequisite(
    manifest.observations?.capacity,
    'external authorized stack runner must supply raw cgroup/process/CPU/API/admission samples; this harness does not boot or resize containers'
  );
  const experiment = JSON.parse(
    artifact(manifest, manifest.observations.capacity)
  );
  assert.equal(experiment.runId, manifest.runId);
  assert.equal(experiment.mcpImageId, manifest.services.mcp.imageId);
  assert.equal(experiment.apiImageId, manifest.services.api.imageId);
  assert.ok(
    experiment.candidates.length >= 1 && experiment.candidates.length <= 2
  );
  const cells = ['N2-P1', 'N4-P1', 'N4-P2', 'N4-P99'];
  let productionPassed = false;
  for (const candidate of experiment.candidates) {
    assert.ok(
      [
        [4 * 2 ** 30, 2, 256, 30000],
        [8 * 2 ** 30, 4, 512, 60000],
      ].some(
        values =>
          JSON.stringify(values) ===
          JSON.stringify([
            candidate.memoryLimit,
            candidate.cpuLimit,
            candidate.heapMb,
            candidate.deadlineMs,
          ])
      )
    );
    assert.ok(
      candidate.hostMemory >
        candidate.memoryLimit + candidate.dependencyReserve,
      'hard limit plus complete dependency reserve must fit'
    );
    assert.ok(candidate.hostCpu >= candidate.cpuLimit);
    assert.deepEqual(
      candidate.cells.map(cell => `N${cell.n}-P${cell.p}`).sort(),
      cells.toSorted()
    );
    for (const cell of candidate.cells) {
      assert.equal(cell.actorLimit, Math.min(cell.p, cell.n - 1));
      assert.ok(cell.repetitions.length >= 1 && cell.repetitions.length <= 3);
      for (const repetition of cell.repetitions) {
        assert.ok(repetition.durationMs > 0 && repetition.durationMs <= 90000);
        const samples = JSON.parse(artifact(manifest, repetition.samples));
        assert.equal(samples.runId, manifest.runId);
        assert.ok(
          samples.parentPid > 0 && samples.parentPid !== samples.apiPid
        );
        assert.equal(samples.memoryMax, candidate.memoryLimit);
        assert.ok(
          samples.parentIdleRss > 0 &&
            samples.worstChildRss > 0 &&
            samples.nativePeak > 0 &&
            samples.cgroupPeak > 0
        );
        assert.ok(samples.cpuUsageUsec > 0 && samples.cpuSamples.length > 1);
        assert.equal(samples.oomKills, 0);
        assert.ok(
          samples.cgroupPeak <= candidate.memoryLimit * 0.8,
          'aggregate peak must retain twenty percent margin'
        );
        assert.ok(
          cell.n <=
            Math.floor(
              (candidate.memoryLimit * 0.8 - samples.parentIdleRss) /
                samples.worstChildRss
            )
        );
        assert.ok(cell.n <= samples.measuredCpuSafeParallelism);
        assert.equal(samples.admission.maxChildren, cell.n);
        assert.equal(samples.admission.overflow.outcome, 'busy');
        assert.equal(samples.admission.overflow.spawns, 0);
        assert.equal(samples.admission.overflow.uploads, 0);
        assert.equal(samples.admission.queued, 0);
        assert.equal(samples.admission.aliasActorId, samples.admission.actorId);
        assert.ok(
          samples.admission.aliasHttpAuthenticated === true &&
            samples.admission.aliasMaxAdmitted === cell.actorLimit
        );
        assert.ok(samples.admission.distinctActors >= cell.n);
        assert.equal(samples.cleanup.children, 0);
        assert.equal(samples.cleanup.slots, 0);
        assert.equal(samples.cleanup.timers, 0);
        assert.equal(samples.api.failures, 0);
        assert.ok(
          samples.api.baselineP95Ms > 0 &&
            samples.api.pressureP95Ms <= samples.api.baselineP95Ms * 1.25
        );
        assert.ok(
          samples.api.authenticated &&
            samples.api.readiness &&
            samples.api.requests > 1
        );
        assert.equal(samples.geometryBaseline.elements, 147);
        assert.ok(samples.geometryBaseline.coldDurableP95Ms <= 10000);
        assert.ok(
          samples.largeDestination.acceptedBytes > 0 &&
            samples.largeDestination.sourceLimit
        );
        assert.ok(
          samples.coverage.imageDecode &&
            samples.coverage.nativeFonts &&
            samples.coverage.mediaAdmission &&
            samples.coverage.sameBoardConcurrentEdit
        );
        assert.equal(
          samples.sharedMemoryAccounting,
          'cgroup-aggregate-with-process-rss-diagnostics'
        );
      }
      if (cell.n >= 4) productionPassed = true;
    }
  }
  assert.equal(
    productionPassed,
    true,
    'enablement held: production capacity must reach four'
  );
  prerequisite(
    experiment.terminationEvidence,
    'separate forced child heap exit and full MCP termination evidence required'
  );
  const terminations = JSON.parse(
    artifact(manifest, experiment.terminationEvidence)
  );
  assert.equal(terminations.runId, manifest.runId);
  assert.deepEqual(terminations.cases.map(item => item.kind).sort(), [
    'child-heap',
    'mcp-process',
  ]);
  for (const item of terminations.cases) {
    assert.equal(item.apiFailures, 0);
    assert.ok(item.apiReadinessProbes > 1);
    assert.equal(item.beforeGo.publications, 0);
    if (item.kind === 'child-heap') {
      assert.equal(item.beforeGo.outcome, 'resource-exhausted-before-go');
      assert.equal(item.afterGo.outcome, 'indeterminate-after-go');
    } else {
      assert.equal(item.beforeGo.transportDisconnected, true);
      assert.equal(item.afterGo.transportDisconnected, true);
      assert.equal(item.afterGo.callerDisposition, 'indeterminate-after-go');
    }
  }
});
