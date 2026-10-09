import { describe, expect, it } from 'vitest';
import { applyNormalization } from './normalization.apply';
import { inventoryNormalization } from './normalization.inventory';
import type {
  Coverage,
  MediaEvent,
  NormalizationFile,
  NormalizationPort,
} from './normalization.types';

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const roomA = id(101),
  roomB = id(102),
  bucketA = id(201),
  bucketB = id(202);
const stage = id(13),
  actor = id(301),
  p = id(401),
  d = id(402);
const media = 'abcdefghijklmnopqrstuvwx';
function fixture() {
  const rows = new Map<string, NormalizationFile>([
    [
      p,
      {
        id: p,
        bucketId: stage,
        reference: media,
        complete: false,
      },
    ],
    [d, { id: d, bucketId: bucketA, complete: true }],
  ]);
  rows.set(id(404), {
    id: id(404),
    bucketId: bucketB,
    complete: true,
  });
  const blobs = new Map([
    [p, 'bytes'],
    [d, 'bytes'],
    [id(404), 'bytes'],
  ]);
  const writes: string[] = [];
  let serial = 500;
  const port: NormalizationPort = {
    supportedRooms: async () => [roomA, roomB],
    targetBucket: async room =>
      room === roomA ? bucketA : room === roomB ? bucketB : undefined,
    referenceSource: async ref =>
      [...rows.values()].find(row => row.reference === ref),
    association: async (bucket, ref) =>
      [...rows.values()].find(
        r => r.bucketId === bucket && r.reference === ref
      ),
    stage: async ref =>
      [...rows.values()].find(r => r.bucketId === stage && r.reference === ref),
    permitted: async () => true,
    copy: async (bucket, source) => {
      const row = {
        id: id(++serial),
        bucketId: bucket,
        reference: source.reference,
        complete: true,
      };
      rows.set(row.id, row);
      blobs.set(row.id, blobs.get(source.id)!);
      writes.push(`copy:${bucket}`);
      return row;
    },
    move: async (bucket, source) => {
      const row = { ...source, bucketId: bucket, complete: true };
      rows.set(source.id, row);
      writes.push(`move:${bucket}`);
      return row;
    },
    removeStage: async file => {
      rows.delete(file);
      writes.push('remove');
    },
  };
  const events: MediaEvent[] = [
    {
      roomId: roomA,
      matrixRoomId: '!a:example',
      eventId: '$a',
      mediaId: media,
      senderId: actor,
      displayName: 'old.png',
      threadId: null,
      timestamp: 1,
    },
    {
      roomId: roomB,
      matrixRoomId: '!b:example',
      eventId: '$b',
      mediaId: media,
      senderId: actor,
      displayName: 'forward.png',
      threadId: '$root',
      timestamp: 2,
    },
  ];
  const coverage: Coverage = {
    schemaVersion: 1,
    scope: 'fixture',
    homeserver: 'example',
    requestedRoomIds: [roomA, roomB],
    resolvedRoomIds: [roomA, roomB],
    startedAt: '2026-10-08T00:00:00Z',
    completedAt: '2026-10-08T01:00:00Z',
    complete: true,
    rooms: [roomA, roomB].map(roomId => ({
      roomId,
      matrixRoomId: roomId === roomA ? '!a:example' : '!b:example',
      mappingComplete: true,
      paginationComplete: true,
      pages: 1,
      eventsScanned: 1,
      attachmentsExported: 1,
      skippedByReason: {},
    })),
  };
  return { port, rows, blobs, writes, events, coverage };
}

const approve = (plan: Awaited<ReturnType<typeof inventoryNormalization>>) => {
  for (const group of plan.groups)
    for (const target of group.targets) target.approved = true;
  return plan;
};

describe('explicitly reviewed reference normalization', () => {
  it('defaults every missing tuple to unapproved and performs no writes on unchanged dry-run input', async () => {
    const f = fixture();
    const plan = await inventoryNormalization(f.port, f.events, f.coverage);
    expect(plan.groups[0].targets.map(t => [t.state, t.approved])).toEqual([
      ['missing', false],
      ['missing', false],
    ]);
    expect(JSON.stringify(plan)).not.toMatch(
      /documentId|fileId|stageId|externalID|cutoff/
    );
    const result = await applyNormalization(f.port, plan);
    expect(result.ok).toBe(true);
    expect(result.records[0].reason).toBe('unapproved_targets');
    expect(f.writes).toEqual([]);
    expect(f.rows.has(p)).toBe(true);
  });
  it('copies before final move, preserves ordinary records, and a second run makes no new writes', async () => {
    const f = fixture();
    const original = { ...f.rows.get(d)! };
    const plan = approve(
      await inventoryNormalization(f.port, f.events, f.coverage)
    );
    const result = await applyNormalization(f.port, plan);
    expect(result.ok).toBe(true);
    expect(f.writes).toEqual([`copy:${bucketA}`, `move:${bucketB}`]);
    expect(f.rows.get(d)).toEqual(original);
    expect(JSON.stringify(result)).not.toMatch(/fileId|documentId|stageId/);
    expect((await applyNormalization(f.port, plan)).ok).toBe(true);
    expect(f.writes).toHaveLength(2);
  });
  it('only creates the approved destination, leaving an excluded deleted attachment unavailable', async () => {
    const f = fixture();
    const plan = await inventoryNormalization(f.port, f.events, f.coverage);
    plan.groups[0].targets[1].approved = true;
    const result = await applyNormalization(f.port, plan);
    expect(result.ok).toBe(true);
    expect(f.writes).toEqual([`move:${bucketB}`]);
    expect(await f.port.association(bucketA, media)).toBeUndefined();
    expect(result.records[0].associations).toContainEqual({
      bucketId: bucketA,
      outcome: 'excluded',
    });
  });
  it('can explicitly copy a known reference from a non-staging source', async () => {
    const f = fixture();
    f.rows.set(p, { ...f.rows.get(p)!, bucketId: bucketA, complete: true });
    const plan = approve(
      await inventoryNormalization(f.port, f.events, f.coverage)
    );
    const result = await applyNormalization(f.port, plan);
    expect(result.ok).toBe(true);
    expect(f.writes).toEqual([`copy:${bucketB}`]);
  });
  it('retains a staging source when an approved source is missing or policy disallows one target', async () => {
    const f = fixture();
    const plan = approve(
      await inventoryNormalization(f.port, f.events, f.coverage)
    );
    f.port.permitted = async bucket => bucket !== bucketB;
    expect((await applyNormalization(f.port, plan)).ok).toBe(false);
    expect(f.writes).toEqual([]);
    f.rows.delete(p);
    const missing = await inventoryNormalization(f.port, f.events, f.coverage);
    expect(missing.groups[0].targets[0].reason).toBe('missing_source');
    expect((await applyNormalization(f.port, approve(missing))).ok).toBe(false);
  });
  it('reports incomplete rows and never deletes/replaces them even when approved', async () => {
    const f = fixture();
    f.rows.set(id(600), {
      id: id(600),
      bucketId: bucketA,
      reference: media,
      complete: false,
    });
    const plan = await inventoryNormalization(f.port, f.events, f.coverage);
    expect(plan.groups[0].targets[0]).toMatchObject({
      state: 'incomplete',
      approved: false,
      reason: 'incomplete_association',
    });
    expect((await applyNormalization(f.port, approve(plan))).ok).toBe(false);
    expect(f.writes).toEqual([]);
  });
  it('requires all supported rooms, even when a fixture export claims complete', async () => {
    const f = fixture();
    f.coverage.requestedRoomIds = [roomB];
    f.coverage.resolvedRoomIds = [roomB];
    f.coverage.rooms = [f.coverage.rooms[1]];
    const plan = approve(
      await inventoryNormalization(f.port, [f.events[1]], f.coverage)
    );
    expect(plan.groups[0].reason).toBe('incomplete_coverage');
    await applyNormalization(f.port, plan);
    expect(f.writes).toEqual([]);
  });
  it('revalidates current room ownership and refuses an edited target bucket', async () => {
    const f = fixture();
    const plan = approve(
      await inventoryNormalization(f.port, f.events, f.coverage)
    );
    plan.groups[0].targets[0].bucketId = id(900);
    expect((await applyNormalization(f.port, plan)).ok).toBe(false);
    expect(f.writes).toEqual([]);
  });
  it('does not reconstruct a complete association deleted after review', async () => {
    const f = fixture();
    const copied = await f.port.copy(bucketA, f.rows.get(p)!, f.events[0]);
    const plan = approve(
      await inventoryNormalization(f.port, f.events, f.coverage)
    );
    f.rows.delete(copied.id);
    f.writes.length = 0;
    expect((await applyNormalization(f.port, plan)).ok).toBe(false);
    expect(f.writes).toEqual([]);
    expect(f.rows.has(p)).toBe(true);
  });
  it('reconciles a committed copy with a lost response without repeating it', async () => {
    const f = fixture();
    const copy = f.port.copy;
    f.port.copy = async (...args) => {
      await copy(...args);
      throw new Error('lost response');
    };
    const result = await applyNormalization(
      f.port,
      approve(await inventoryNormalization(f.port, f.events, f.coverage))
    );
    expect(result.ok).toBe(true);
    expect(result.counts.reconciled).toBe(1);
    expect(f.writes).toHaveLength(2);
  });
  it('removes a redundant staging row only after all extant destinations are confirmed complete', async () => {
    const f = fixture();
    for (const bucket of [bucketA, bucketB])
      await f.port.copy(bucket, f.rows.get(p)!, f.events[0]);
    f.writes.length = 0;
    const result = await applyNormalization(
      f.port,
      await inventoryNormalization(f.port, f.events, f.coverage)
    );
    expect(result.ok).toBe(true);
    expect(f.writes).toEqual(['remove']);
    expect(result.counts.redundantStageRemoved).toBe(1);
  });
  it('rejects legacy document hints, missing approval fields, and substituted event evidence', async () => {
    const f = fixture();
    const plan = await inventoryNormalization(f.port, f.events, f.coverage);
    const legacy = JSON.parse(JSON.stringify(plan));
    legacy.events[0].documentId = d;
    await expect(applyNormalization(f.port, legacy)).rejects.toThrow(
      'unknown_evidence_field'
    );
    const noApproval = JSON.parse(JSON.stringify(plan));
    delete noApproval.groups[0].targets[0].approved;
    await expect(applyNormalization(f.port, noApproval)).rejects.toThrow(
      'invalid_target'
    );
    const substituted = JSON.parse(JSON.stringify(plan));
    substituted.groups[0].events[0].senderId = id(999);
    await expect(applyNormalization(f.port, substituted)).rejects.toThrow(
      'invalid_group_events'
    );
    expect(f.writes).toEqual([]);
  });
  it('blocks changed supported-room coverage after review without removing staging', async () => {
    const f = fixture();
    const plan = approve(
      await inventoryNormalization(f.port, f.events, f.coverage)
    );
    f.port.supportedRooms = async () => [roomA, roomB, id(103)];
    const result = await applyNormalization(f.port, plan);
    expect(result.ok).toBe(false);
    expect(result.records[0].reason).toBe('incomplete_coverage');
    expect(f.writes).toEqual([]);
  });
  it('allows redacted-event counts without touching media absent from the exported events', async () => {
    const f = fixture();
    f.coverage.rooms[0].skippedByReason.redacted = 1;
    f.coverage.rooms[0].eventsScanned++;
    const plan = await inventoryNormalization(f.port, f.events, f.coverage);
    expect(plan.groups[0].eligible).toBe(true);
  });
});
