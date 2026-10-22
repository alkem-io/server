import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { join } from 'node:path';
import test from 'node:test';
import {
  artifact,
  board,
  loadManifest,
  prerequisite,
  readRoom,
  root,
} from './harness.mjs';

test('US4-AS1: real child PREPARED then cancel, stale GO, IPC close, kill or deadline publishes nothing', async () => {
  const manifest = loadManifest();
  const id = board(manifest, 'faults');
  const entry =
    'dist/services/mcp-server/executor/whiteboard-executor.entry.js';
  prerequisite(
    manifest.buildHashes[entry],
    'built production child entry hash required'
  );
  for (const fault of [
    'cancel',
    'stale-go',
    'disconnect',
    'kill',
    'deadline',
  ]) {
    const before = await readRoom(manifest, id);
    const child = fork(join(root, entry), [], {
      execArgv: ['--max-old-space-size=256'],
      env: {
        LANG: 'en_US.UTF-8',
        MCP_EXECUTOR_COLLAB_URL: manifest.services.collaboration.endpoint,
        MCP_EXECUTOR_ACTOR_HEADER: manifest.actorHeader,
      },
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    });
    const messages = [];
    const exited = once(child, 'exit');
    const jobId = randomUUID();
    let preparedResolve;
    const prepared = new Promise(resolve => {
      preparedResolve = resolve;
    });
    child.on('message', message => {
      messages.push(message);
      if (message.type === 'PREPARED') preparedResolve(message);
      // The real parent retires its disposable child on a terminal response.
      if (message.type === 'FAILED') child.kill('SIGKILL');
    });
    const timer = AbortSignal.timeout(15000);
    try {
      child.send({
        type: 'START',
        operations: [{ op: 'addText', text: `unpublished ${fault}` }],
        childLaunchGrant: {
          jobId,
          documentId: id,
          actorId: manifest.fixtures.actors.author.id,
          deadline: Date.now() + (fault === 'deadline' ? 5000 : 10000),
          intent: 'edit-whiteboard-elements',
        },
      });
      const metadata = await Promise.race([
        prepared,
        exited.then(() => {
          throw new Error('Child exited before PREPARED');
        }),
        new Promise((_, reject) =>
          timer.addEventListener(
            'abort',
            () => reject(new Error('PREPARED timeout')),
            { once: true }
          )
        ),
      ]);
      assert.equal(metadata.jobId, jobId);
      assert.equal(metadata.generationId, 1);
      assert.match(metadata.updateDigest, /^[a-f\d]{64}$/);
      assert.ok(metadata.byteLength > 0);
      assert.ok(
        JSON.stringify(await readRoom(manifest, id)) === JSON.stringify(before),
        'room changed before GO (payload redacted)'
      );
      if (fault === 'cancel')
        child.send({ type: 'CANCEL', jobId, generationId: 1 });
      if (fault === 'stale-go')
        child.send({ type: 'GO', jobId, generationId: 2 });
      if (fault === 'disconnect') child.disconnect();
      if (fault === 'kill') child.kill('SIGKILL');
      await Promise.race([
        exited,
        new Promise((_, reject) =>
          timer.addEventListener(
            'abort',
            () => reject(new Error('Child cleanup timeout')),
            { once: true }
          )
        ),
      ]);
      assert.ok(
        !messages.some(
          message => message.type === 'PUBLISHED' || message.type === 'DURABLE'
        )
      );
      if (['cancel', 'stale-go', 'deadline'].includes(fault))
        assert.equal(
          messages.at(-1).typedOutcome,
          {
            cancel: 'cancelled-before-go',
            'stale-go': 'invalid',
            deadline: 'timeout-before-go',
          }[fault]
        );
      assert.ok(
        JSON.stringify(await readRoom(manifest, id)) === JSON.stringify(before),
        'room changed before GO (payload redacted)'
      );
    } finally {
      if (child.exitCode === null && child.signalCode === null)
        child.kill('SIGKILL');
      await exited;
    }
  }
});

test('US4-AS1/AS4: external real socket faults preserve identical bytes and phase-correct media ownership', () => {
  const manifest = loadManifest();
  prerequisite(
    manifest.observations?.socketFaults,
    'external run-owned socket fault capture required: real child transport, outbound bytes, PREPARED/GO/PUBLISHED/durability, fresh/reused media audit; no production hook is added'
  );
  const evidence = JSON.parse(
    artifact(manifest, manifest.observations.socketFaults)
  );
  assert.equal(evidence.runId, manifest.runId);
  assert.equal(evidence.mcpImageId, manifest.services.mcp.imageId);
  const required = [
    'before-go-caller-disconnect',
    'before-go-upload-cancel',
    'after-go-disconnect',
    'after-go-kill',
    'after-go-oom',
    'after-go-deadline',
    'transient-resend',
  ];
  assert.deepEqual(
    evidence.cases.map(item => item.fault).sort(),
    required.sort()
  );
  for (const item of evidence.cases) {
    prerequisite(
      item.capture && item.mediaAudit && item.coldRead,
      'raw fault, media and cold-read captures required'
    );
    const capture = JSON.parse(artifact(manifest, item.capture));
    const audit = JSON.parse(artifact(manifest, item.mediaAudit));
    const cold = JSON.parse(artifact(manifest, item.coldRead));
    assert.equal(capture.runId, manifest.runId);
    assert.equal(audit.runId, manifest.runId);
    assert.equal(cold.runId, manifest.runId);
    if (item.fault === 'before-go-upload-cancel') {
      assert.equal(capture.childPid, null);
      assert.ok(
        !capture.events.some(event =>
          ['START', 'SYNCED', 'PREPARED', 'GO', 'PUBLISHED', 'DURABLE'].includes(event.type)
        )
      );
      assert.equal(audit.settled, true);
      assert.equal(item.outcome, 'cancelled-before-go');
    } else {
      assert.ok(
        capture.childPid > 0 &&
          capture.events.some(event => event.type === 'PREPARED')
      );
    }
    if (item.fault.startsWith('before-go')) {
      assert.ok(
        !capture.events.some(
          event => event.type === 'GO' || event.type === 'PUBLISHED'
        )
      );
      assert.equal(capture.updates.length, 0);
      assert.deepEqual(audit.deleted.sort(), audit.fresh.sort());
      assert.equal(cold.addedElementIds.length, 0);
    } else {
      assert.ok(capture.events.some(event => event.type === 'GO'));
      assert.deepEqual(audit.deleted, []);
      assert.ok(
        ['durable-success', 'indeterminate-after-go'].includes(item.outcome)
      );
    }
    assert.ok(audit.reused.every(id => !audit.deleted.includes(id)));
    if (item.fault === 'transient-resend') {
      assert.ok(capture.updates.length >= 2);
      const bytes = capture.updates.map(descriptor =>
        artifact(manifest, descriptor)
      );
      for (const update of bytes)
        assert.ok(
          update.equals(bytes[0]),
          'resend bytes differ (payload redacted)'
        );
      assert.equal(
        new Set(cold.addedElementIds).size,
        cold.addedElementIds.length
      );
      assert.equal(cold.semanticEffects, 1);
      assert.equal(item.outcome, 'durable-success');
      assert.ok(capture.events.some(event => event.type === 'DURABLE'));
    }
  }
});
