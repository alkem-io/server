import { parseCoverage, parseMediaEvents } from './normalization.command';
import type {
  Coverage,
  MediaEvent,
  NormalizationGroup,
  NormalizationPlan,
  NormalizationPort,
} from './normalization.types';

const sameSet = (left: string[], right: string[]): boolean => {
  const a = [...left].sort(),
    b = [...right].sort();
  return (
    a.length === b.length &&
    new Set(a).size === a.length &&
    a.every((value, index) => value === b[index])
  );
};

export function coverageIsComplete(
  events: MediaEvent[],
  coverage: Coverage,
  supportedRooms: string[]
): boolean {
  if (
    !coverage.complete ||
    !sameSet(coverage.requestedRoomIds, supportedRooms) ||
    !sameSet(coverage.resolvedRoomIds, supportedRooms) ||
    !sameSet(
      coverage.rooms.map(room => room.roomId),
      supportedRooms
    )
  )
    return false;
  const roomEvents = new Map<string, MediaEvent[]>();
  for (const event of events) {
    const group = roomEvents.get(event.roomId) ?? [];
    group.push(event);
    roomEvents.set(event.roomId, group);
  }
  // A redacted event exposes no attachment reference to current readers. Its
  // unidentifiable staging data is not among candidate groups and stays put.
  for (const room of coverage.rooms) {
    const exported = roomEvents.get(room.roomId) ?? [];
    if (
      !room.mappingComplete ||
      !room.paginationComplete ||
      room.failure ||
      !room.matrixRoomId ||
      room.attachmentsExported !== exported.length ||
      room.eventsScanned < exported.length ||
      Object.entries(room.skippedByReason).some(
        ([reason, count]) => count > 0 && reason !== 'redacted'
      ) ||
      exported.some(event => event.matrixRoomId !== room.matrixRoomId)
    )
      return false;
    roomEvents.delete(room.roomId);
  }
  return roomEvents.size === 0;
}

/** Inventory is evidence, never permission to recreate a deleted association. */
export async function inspectNormalizationGroup(
  port: NormalizationPort,
  events: MediaEvent[],
  completeCoverage: boolean
): Promise<NormalizationGroup> {
  const mediaId = events[0].mediaId;
  const group: NormalizationGroup = {
    mediaId,
    eligible: false,
    events,
    targets: [],
  };
  if (!completeCoverage) return { ...group, reason: 'incomplete_coverage' };
  const byBucket = new Map<string, NormalizationGroup['targets'][number]>();
  const source =
    (await port.stage(mediaId)) ?? (await port.referenceSource(mediaId));
  for (const event of events) {
    const bucketId = await port.targetBucket(event.roomId);
    if (!bucketId) return { ...group, reason: 'unmapped_room' };
    if (byBucket.has(bucketId)) continue;
    const current = await port.association(bucketId, mediaId);
    const state = current
      ? current.complete
        ? 'complete'
        : 'incomplete'
      : 'missing';
    const reason =
      state === 'complete'
        ? undefined
        : state === 'incomplete'
          ? 'incomplete_association'
          : !source
            ? 'missing_source'
            : !event.senderId
              ? 'unmapped_sender'
              : !(await port.permitted(bucketId, source.id))
                ? 'bucket_policy_denied'
                : undefined;
    byBucket.set(bucketId, {
      bucketId,
      event,
      state,
      approved: false,
      ...(reason ? { reason } : {}),
    });
  }
  group.targets = [...byBucket.values()].sort((a, b) =>
    a.bucketId.localeCompare(b.bucketId)
  );
  group.eligible = true;
  return group;
}

export async function inventoryNormalization(
  port: NormalizationPort,
  inputEvents: MediaEvent[],
  inputCoverage: Coverage
): Promise<NormalizationPlan> {
  const events = parseMediaEvents(inputEvents),
    coverage = parseCoverage(inputCoverage);
  const supportedRoomIds = [...(await port.supportedRooms())].sort();
  const complete = coverageIsComplete(events, coverage, supportedRoomIds);
  const references = new Map<string, MediaEvent[]>();
  for (const event of events) {
    const existing = references.get(event.mediaId) ?? [];
    existing.push(event);
    references.set(event.mediaId, existing);
  }
  const groups: NormalizationGroup[] = [];
  for (const [_, occurrences] of [...references].sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    occurrences.sort(
      (a, b) => a.timestamp - b.timestamp || a.eventId.localeCompare(b.eventId)
    );
    try {
      groups.push(await inspectNormalizationGroup(port, occurrences, complete));
    } catch {
      groups.push({
        mediaId: occurrences[0].mediaId,
        eligible: false,
        reason: 'inventory_unavailable',
        events: occurrences,
        targets: [],
      });
    }
  }
  return {
    schemaVersion: 1,
    supportedRoomIds,
    coverage,
    events,
    groups,
  };
}
