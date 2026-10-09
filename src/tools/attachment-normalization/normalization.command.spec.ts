import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  parseCoverage,
  parseMediaEvents,
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
});
