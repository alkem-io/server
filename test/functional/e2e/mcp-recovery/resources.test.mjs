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
    'separate forced child resource exit and full MCP termination evidence required'
  );
  const terminations = JSON.parse(
    artifact(manifest, experiment.terminationEvidence)
  );
  assert.equal(terminations.runId, manifest.runId);
  assert.deepEqual(terminations.cases.map(item => item.kind).sort(), [
    'child-resource',
    'mcp-process',
  ]);
  for (const item of terminations.cases) {
    assert.equal(item.apiFailures, 0);
    assert.ok(item.apiReadinessProbes > 1);
    assert.equal(item.beforeGo.publications, 0);
    if (item.kind === 'child-resource') {
      assert.equal(item.beforeGo.outcome, 'resource-exhausted-before-go');
      assert.equal(item.afterGo.outcome, 'indeterminate-after-go');
      for (const [phase, subcase] of [
        ['before-go', item.beforeGo],
        ['after-go', item.afterGo],
      ]) {
        const proof = subcase.resourceEvidence;
        prerequisite(proof, `${phase} resource mechanism provenance required`);
        assert.ok(['kernel-cgroup-oom', 'v8-heap'].includes(proof.mechanism));
        const fault = JSON.parse(artifact(manifest, proof.faultEvidence));
        const exit = JSON.parse(artifact(manifest, proof.exitEvidence));
        assert.equal(fault.runId, manifest.runId);
        assert.equal(fault.phase, phase);
        assert.ok(typeof fault.case === 'string' && fault.case.length > 0);
        assert.equal(fault.imageId, manifest.services.mcp.imageId);
        assert.equal(fault.imageId, item.mcpImageId);
        assert.equal(fault.containerId, subcase.mcpContainerId);
        assert.ok(
          typeof fault.containerId === 'string' && fault.containerId.length > 0
        );
        assert.ok(
          Number.isInteger(fault.childContainerPid) &&
            fault.childContainerPid > 0
        );
        assert.ok(
          Number.isInteger(fault.childStartTicks) && fault.childStartTicks > 0
        );
        assert.ok(Number.isInteger(fault.childUid) && fault.childUid >= 0);
        for (const field of [
          'runId',
          'case',
          'containerId',
          'imageId',
          'childContainerPid',
          'childStartTicks',
          'childUid',
          'phase',
        ])
          assert.equal(exit[field], fault[field]);
        assert.equal(exit.code, null);
        if (proof.mechanism === 'kernel-cgroup-oom') {
          assert.equal(fault.kind, 'external-child-only-cgroup-memory-oom');
          assert.ok(
            Number.isInteger(fault.childHostPid) && fault.childHostPid > 0
          );
          assert.ok(
            Number.isInteger(fault.mcpParentHostPid) &&
              fault.mcpParentHostPid > 0
          );
          assert.equal(fault.childParentHostPid, fault.mcpParentHostPid);
          assert.notEqual(fault.childHostPid, fault.mcpParentHostPid);
          assert.equal(fault.mcpParentExcludedFromLeaf, true);
          assert.equal(
            fault.cgroupPath,
            `/docker/forge088-oom-${manifest.runId}`
          );
          assert.ok(
            Number.isInteger(fault.memoryMaxBytes) && fault.memoryMaxBytes > 0
          );
          assert.ok(
            Number.isInteger(fault.memoryEventsBefore?.oom_kill) &&
              fault.memoryEventsBefore.oom_kill >= 0
          );
          assert.ok(
            Number.isInteger(fault.memoryEventsAfter?.oom_kill) &&
              fault.memoryEventsAfter.oom_kill >
                fault.memoryEventsBefore.oom_kill
          );
          assert.equal(fault.kernelOomKillProven, true);
          assert.equal(fault.childObservedExited, true);
          assert.equal(exit.signal, 'SIGKILL');
        } else {
          assert.equal(fault.kind, 'child-v8-fatal-heap');
          assert.equal(exit.signal, 'SIGABRT');
          const stderr = artifact(manifest, fault.fatalHeapEvidence).toString(
            'utf8'
          );
          assert.match(
            stderr,
            /FATAL ERROR:.*(?:heap out of memory|Allocation failed)/
          );
          assert.match(stderr, new RegExp(`\\[${fault.childContainerPid}:`));
        }
      }
    } else {
      assert.equal(item.beforeGo.transportDisconnected, true);
      assert.equal(item.afterGo.transportDisconnected, true);
      assert.equal(item.afterGo.callerDisposition, 'indeterminate-after-go');
    }
  }
});
