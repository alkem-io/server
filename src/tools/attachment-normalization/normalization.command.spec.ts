import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  parseCoverage,
  parseMediaEvents,
  parseNormalizationPlan,
  parseNormalizationCommand,
  readPrivateJson,
  writePrivateReport,
} from './normalization.command';

const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map(path => rm(path, { recursive: true, force: true }))
  );
});
describe('normalization operator boundary', () => {
  it('defaults to dry-run and requires explicit apply plan', () => {
    expect(
      parseNormalizationCommand([
        '--events',
        'events.jsonl',
        '--report',
        'plan.json',
      ])
    ).toEqual({ mode: 'dry-run', events: 'events.jsonl', report: 'plan.json' });
    expect(
      parseNormalizationCommand([
        '--apply',
        '--plan',
        'plan.json',
        '--report',
        'result.json',
      ]).mode
    ).toBe('apply');
  });
  it.each(
    [
      ['--apply', '--events', 'e', '--report', 'r'],
      ['--apply', '--dry-run', '--plan', 'p', '--report', 'r'],
      ['--events', 'e', '--plan', 'p', '--report', 'r'],
      ['--list-rooms', '--apply', '--report', 'r'],
      ['--events', 'e', '--report', 'r', '--report', 'again'],
      ['--query', 'DELETE FROM file', '--report', 'r'],
    ].map(args => [args] as [string[]])
  )('rejects conflicting/arbitrary execution input %j', args => {
    expect(() => parseNormalizationCommand(args)).toThrow();
  });
  it('rejects unknown fields and malformed evidence rather than treating data as grants', () => {
    expect(() =>
      parseMediaEvents([{ roomId: '../../etc/passwd', sql: 'DELETE' }])
    ).toThrow();
    expect(() =>
      parseCoverage({ schemaVersion: 1, query: 'DELETE' })
    ).toThrow();
  });
  it('writes private bounded reports and never overwrites an existing plan', async () => {
    const path = await mkdtemp(
      join(tmpdir(), 'attachment-normalization-test-')
    );
    dirs.push(path);
    const output = join(path, 'plan.json');
    await writePrivateReport(output, { ok: true });
    expect((await stat(output)).mode & 0o777).toBe(0o600);
    expect(await readPrivateJson(output)).toEqual({ ok: true });
    await expect(writePrivateReport(output, { ok: false })).rejects.toThrow();
    expect(JSON.parse(await readFile(output, 'utf8'))).toEqual({ ok: true });
  });

  it('round-trips a complete plan for 100,000 distinct media references', async () => {
    const path = await mkdtemp(join(tmpdir(), 'attachment-normalization-limit-'));
    dirs.push(path);
    const roomId = '00000000-0000-4000-8000-000000000001';
    const senderId = '00000000-0000-4000-8000-000000000002';
    const bucketId = '00000000-0000-4000-8000-000000000003';
    const events = Array.from({ length: 100_000 }, (_, index) => ({
      roomId, matrixRoomId: '!r', eventId: `$e${index}`, senderId,
      mediaId: `m${index}`, displayName: 'x', threadId: null, timestamp: 0,
    }));
    const plan = {
      schemaVersion: 1,
      supportedRoomIds: [roomId],
      coverage: {
        schemaVersion: 1, scope: 'supported-room-inventory', homeserver: 'h',
        requestedRoomIds: [roomId], resolvedRoomIds: [roomId],
        startedAt: '2026-01-01T00:00:00.000Z', completedAt: '2026-01-01T00:00:00.000Z', complete: true,
        rooms: [{ roomId, matrixRoomId: '!r', mappingComplete: true, paginationComplete: true,
          pages: 1, eventsScanned: events.length, attachmentsExported: events.length, skippedByReason: {} }],
      },
      events,
      groups: events.map(event => ({ mediaId: event.mediaId, eligible: true, events: [event],
        targets: [{ bucketId, event, state: 'missing', approved: false, reason: 'missing_source' }] })),
    };
    const output = join(path, 'plan.json');
    await writePrivateReport(output, plan);
    expect((await stat(output)).size).toBeGreaterThan(64 * 1024 * 1024);
    const restored = parseNormalizationPlan(await readPrivateJson(output, 256 * 1024 * 1024));
    expect(restored.events).toHaveLength(events.length);
    expect(restored.groups.at(-1)?.targets[0].event).toEqual(events.at(-1));
  }, 30_000);
});
