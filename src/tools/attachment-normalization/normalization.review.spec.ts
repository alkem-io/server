import { expect, it } from 'vitest';
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

function reviewFixture() {
  const roomA = id(101),
    roomB = id(102),
    bucketA = id(201),
    bucketB = id(202);
  const p = id(401),
    copyA = id(402),
    dA = id(403),
    dB = id(404),
    staging = id(13);
  const media = 'retained_media_reference';
  const rows = new Map<string, NormalizationFile>([
    [
      p,
      {
        id: p,
        bucketId: staging,
        reference: media,
        complete: false,
      },
    ],
    [dA, { id: dA, bucketId: bucketA, complete: true }],
    [dB, { id: dB, bucketId: bucketB, complete: true }],
  ]);
  const writes: string[] = [];
  let deleteCopiedTargetOnNextInspection = false;
  const port: NormalizationPort = {
    supportedRooms: async () => [roomA, roomB],
    targetBucket: async room => {
      if (deleteCopiedTargetOnNextInspection) {
        deleteCopiedTargetOnNextInspection = false;
        rows.delete(copyA);
      }
      return room === roomA ? bucketA : bucketB;
    },
    referenceSource: async ref =>
      [...rows.values()].find(row => row.reference === ref),
    association: async (bucket, reference) =>
      [...rows.values()].find(
        row => row.bucketId === bucket && row.reference === reference
      ),
    stage: async () => [...rows.values()].find(row => row.bucketId === staging),
    permitted: async () => true,
    copy: async (bucket, source) => {
      const copied = { ...source, id: copyA, bucketId: bucket, complete: true };
      rows.set(copyA, copied);
      writes.push('copy');
      deleteCopiedTargetOnNextInspection = true;
      return copied;
    },
    move: async (bucket, source) => {
      const moved = { ...source, bucketId: bucket, complete: true };
      rows.set(source.id, moved);
      writes.push('move');
      return moved;
    },
    removeStage: async fileId => {
      rows.delete(fileId);
      writes.push('remove');
    },
  };
  const events: MediaEvent[] = [roomA, roomB].map((roomId, index) => ({
    roomId,
    matrixRoomId: `!room${index}:test.local`,
    eventId: `$event${index}`,
    senderId: id(301),
    mediaId: media,
    displayName: 'old.png',
    threadId: null,
    timestamp: index + 1,
  }));
  const coverage: Coverage = {
    schemaVersion: 1,
    scope: 'fixture',
    homeserver: 'test.local',
    requestedRoomIds: [roomA, roomB],
    resolvedRoomIds: [roomA, roomB],
    startedAt: '2026-10-08T00:00:00Z',
    completedAt: '2026-10-08T00:01:00Z',
    complete: true,
    rooms: events.map(event => ({
      roomId: event.roomId,
      matrixRoomId: event.matrixRoomId,
      mappingComplete: true,
      paginationComplete: true,
      pages: 1,
      eventsScanned: 1,
      attachmentsExported: 1,
      skippedByReason: {},
    })),
  };
  return { port, rows, writes, events, coverage, p, staging, copyA };
}

it('keeps P when a newly copied destination is deliberately deleted before final MOVE', async () => {
  const { port, rows, writes, events, coverage, p, staging, copyA } =
    reviewFixture();
  const plan = await inventoryNormalization(port, events, coverage);
  expect(plan.groups[0].eligible).toBe(true);
  for (const target of plan.groups[0].targets) target.approved = true;
  const result = await applyNormalization(port, plan);
  expect(result.ok).toBe(false);
  expect(writes).toEqual(['copy']);
  expect(rows.get(p)?.bucketId).toBe(staging);
  expect(rows.has(copyA)).toBe(false);
});
