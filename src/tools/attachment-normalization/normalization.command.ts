import { open } from 'node:fs/promises';
import { isUUID } from 'class-validator';
import type {
  Coverage,
  MediaEvent,
  NormalizationPlan,
} from './normalization.types';

export const MAX_NORMALIZATION_BYTES = 64 * 1024 * 1024;
export const MAX_NORMALIZATION_EVENTS = 100_000;
export type NormalizationCommand =
  | { mode: 'inventory'; report: string }
  | { mode: 'dry-run'; events: string; report: string }
  | { mode: 'apply'; plan: string; report: string };

export function parseNormalizationCommand(
  args: string[]
): NormalizationCommand {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (['--apply', '--dry-run', '--list-rooms'].includes(key)) {
      if (flags.has(key)) throw new Error('duplicate_argument');
      flags.add(key);
    } else if (['--events', '--plan', '--report'].includes(key)) {
      const value = args[++i];
      if (!value || value.startsWith('--') || values.has(key))
        throw new Error('invalid_argument');
      values.set(key, value);
    } else throw new Error('unknown_argument');
  }
  const report = values.get('--report');
  if (!report) throw new Error('report_required');
  if (flags.has('--list-rooms')) {
    if (flags.size !== 1 || values.size !== 1)
      throw new Error('invalid_inventory_arguments');
    return { mode: 'inventory', report };
  }
  if (flags.has('--apply')) {
    if (flags.size !== 1 || values.size !== 2 || !values.has('--plan'))
      throw new Error('reviewed_plan_required');
    return { mode: 'apply', plan: values.get('--plan')!, report };
  }
  if (values.size !== 2 || !values.has('--events') || flags.size > 1)
    throw new Error('events_required');
  return { mode: 'dry-run', events: values.get('--events')!, report };
}

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
function keys(value: Record<string, unknown>, allowed: string[]): void {
  if (Object.keys(value).some(key => !allowed.includes(key)))
    throw new Error('unknown_evidence_field');
}
const bounded = (value: unknown, max: number): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  Buffer.byteLength(value) <= max &&
  // biome-ignore lint/suspicious/noControlCharactersInRegex: reject control bytes in private operator evidence
  !/[\x00-\x1f\x7f]/.test(value);
const uuid = (value: unknown): value is string =>
  typeof value === 'string' && isUUID(value);
const nonnegative = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 0;
export function parseMediaEvents(value: unknown): MediaEvent[] {
  if (!Array.isArray(value) || value.length > MAX_NORMALIZATION_EVENTS)
    throw new Error('invalid_events');
  const seen = new Set<string>();
  for (const event of value) {
    if (!record(event)) throw new Error('invalid_event');
    keys(event, [
      'roomId',
      'matrixRoomId',
      'eventId',
      'senderId',
      'mediaId',
      'displayName',
      'threadId',
      'timestamp',
    ]);
    if (
      !uuid(event.roomId) ||
      !bounded(event.matrixRoomId, 512) ||
      !event.matrixRoomId.startsWith('!') ||
      !bounded(event.eventId, 512) ||
      !event.eventId.startsWith('$') ||
      !bounded(event.mediaId, 256) ||
      !/^[A-Za-z0-9_-]+$/.test(event.mediaId) ||
      !bounded(event.displayName, 512) ||
      (event.senderId !== null && !uuid(event.senderId)) ||
      (event.threadId !== null &&
        (!bounded(event.threadId, 512) || !event.threadId.startsWith('$'))) ||
      !nonnegative(event.timestamp)
    )
      throw new Error('invalid_event');
    const key = `${event.roomId}|${event.eventId}|${event.mediaId}`;
    if (seen.has(key)) throw new Error('duplicate_event');
    seen.add(key);
  }
  return value as MediaEvent[];
}
export function parseCoverage(value: unknown): Coverage {
  if (!record(value)) throw new Error('invalid_coverage');
  keys(value, [
    'schemaVersion',
    'scope',
    'homeserver',
    'requestedRoomIds',
    'resolvedRoomIds',
    'startedAt',
    'completedAt',
    'complete',
    'rooms',
  ]);
  if (
    value.schemaVersion !== 1 ||
    !['fixture', 'supported-room-inventory'].includes(value.scope as string) ||
    !bounded(value.homeserver, 255) ||
    typeof value.complete !== 'boolean' ||
    ![value.startedAt, value.completedAt].every(
      v => typeof v === 'string' && Number.isFinite(Date.parse(v))
    ) ||
    ![value.requestedRoomIds, value.resolvedRoomIds].every(
      v =>
        Array.isArray(v) &&
        v.length <= MAX_NORMALIZATION_EVENTS &&
        v.every(uuid) &&
        new Set(v).size === v.length
    ) ||
    !Array.isArray(value.rooms) ||
    value.rooms.length > MAX_NORMALIZATION_EVENTS
  )
    throw new Error('invalid_coverage');
  for (const room of value.rooms) {
    if (!record(room)) throw new Error('invalid_room_coverage');
    keys(room, [
      'roomId',
      'matrixRoomId',
      'mappingComplete',
      'paginationComplete',
      'pages',
      'eventsScanned',
      'attachmentsExported',
      'skippedByReason',
      'failure',
    ]);
    if (
      !uuid(room.roomId) ||
      (room.matrixRoomId !== undefined &&
        (!bounded(room.matrixRoomId, 512) ||
          !room.matrixRoomId.startsWith('!'))) ||
      typeof room.mappingComplete !== 'boolean' ||
      typeof room.paginationComplete !== 'boolean' ||
      ![room.pages, room.eventsScanned, room.attachmentsExported].every(
        nonnegative
      ) ||
      !record(room.skippedByReason) ||
      Object.entries(room.skippedByReason).some(
        ([key, count]) => !/^[a-z0-9_]{1,64}$/.test(key) || !nonnegative(count)
      ) ||
      (room.failure !== undefined && !bounded(room.failure, 64))
    )
      throw new Error('invalid_room_coverage');
  }
  return value as unknown as Coverage;
}
export function parseNormalizationPlan(value: unknown): NormalizationPlan {
  if (!record(value)) throw new Error('invalid_plan');
  keys(value, [
    'schemaVersion',
    'supportedRoomIds',
    'coverage',
    'events',
    'groups',
  ]);
  const events = parseMediaEvents(value.events);
  parseCoverage(value.coverage);
  if (
    value.schemaVersion !== 1 ||
    !Array.isArray(value.supportedRoomIds) ||
    !value.supportedRoomIds.every(uuid) ||
    new Set(value.supportedRoomIds).size !== value.supportedRoomIds.length ||
    !Array.isArray(value.groups) ||
    value.groups.length > MAX_NORMALIZATION_EVENTS
  )
    throw new Error('invalid_plan');
  const references = new Set<string>();
  for (const group of value.groups) {
    if (!record(group)) throw new Error('invalid_group');
    keys(group, ['mediaId', 'eligible', 'reason', 'events', 'targets']);
    if (
      !bounded(group.mediaId, 256) ||
      references.has(group.mediaId) ||
      typeof group.eligible !== 'boolean' ||
      (group.reason !== undefined && !bounded(group.reason, 64)) ||
      !Array.isArray(group.targets)
    )
      throw new Error('invalid_group');
    references.add(group.mediaId);
    const occurrences = parseMediaEvents(group.events);
    const expectedEvents = events.filter(
      event => event.mediaId === group.mediaId
    );
    const eventKey = (event: MediaEvent) => JSON.stringify(event);
    if (
      JSON.stringify(occurrences.map(eventKey).sort()) !==
      JSON.stringify(expectedEvents.map(eventKey).sort())
    )
      throw new Error('invalid_group_events');
    const buckets = new Set<string>();
    for (const target of group.targets) {
      if (!record(target)) throw new Error('invalid_target');
      keys(target, ['bucketId', 'event', 'state', 'approved', 'reason']);
      if (
        !uuid(target.bucketId) ||
        !['complete', 'missing', 'incomplete'].includes(
          target.state as string
        ) ||
        typeof target.approved !== 'boolean' ||
        (target.reason !== undefined && !bounded(target.reason, 64))
      )
        throw new Error('invalid_target');
      const [event] = parseMediaEvents([target.event]);
      if (
        buckets.has(target.bucketId as string) ||
        !occurrences.some(value => eventKey(value) === eventKey(event))
      )
        throw new Error('invalid_target');
      buckets.add(target.bucketId as string);
    }
  }
  const expected = new Set(events.map(e => e.mediaId));
  if (
    references.size !== expected.size ||
    [...references].some(r => !expected.has(r))
  )
    throw new Error('invalid_reference_groups');
  return value as unknown as NormalizationPlan;
}
export async function readPrivateJson(path: string): Promise<unknown> {
  const handle = await open(path, 'r');
  try {
    const file = await handle.stat();
    if (
      !file.isFile() ||
      (file.mode & 0o077) !== 0 ||
      file.size > MAX_NORMALIZATION_BYTES
    )
      throw new Error('evidence_not_private_or_bounded');
    return JSON.parse(await handle.readFile('utf8'));
  } finally {
    await handle.close();
  }
}
export async function readPrivateEvents(path: string): Promise<MediaEvent[]> {
  const handle = await open(path, 'r');
  try {
    const file = await handle.stat();
    if (
      !file.isFile() ||
      (file.mode & 0o077) !== 0 ||
      file.size > MAX_NORMALIZATION_BYTES
    )
      throw new Error('evidence_not_private_or_bounded');
    const text = await handle.readFile('utf8');
    return parseMediaEvents(
      text
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line))
    );
  } finally {
    await handle.close();
  }
}
export async function reservePrivateReport(
  path: string
): Promise<{ write(value: unknown): Promise<void>; close(): Promise<void> }> {
  // Acquire before any mutation, so an existing report cannot be overwritten
  // and an unusable output path cannot fail after an otherwise successful apply.
  const output = await open(path, 'wx', 0o600);
  let closed = false;
  return {
    async write(value: unknown) {
      const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
      if (bytes.length > MAX_NORMALIZATION_BYTES)
        throw new Error('report_too_large');
      await output.writeFile(bytes);
      await output.sync();
    },
    async close() {
      if (!closed) {
        closed = true;
        await output.close();
      }
    },
  };
}
export async function writePrivateReport(
  path: string,
  value: unknown
): Promise<void> {
  const output = await reservePrivateReport(path);
  try {
    await output.write(value);
  } finally {
    await output.close();
  }
}
