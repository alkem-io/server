import { execFileSync } from 'node:child_process';

const SPEC =
  'src/domain/timeline/event/calendar.event.calendar-links.wholeday-tz.spec.ts';

/**
 * The sibling `*.wholeday-tz.spec.ts` asserts fixed date strings, which only prove
 * timezone-INDEPENDENCE when the process runs under a NON-UTC timezone: under a UTC
 * runner (e.g. CI) a regression to process-local date parts is invisible, because
 * local parts and UTC parts coincide there. Node fixes the process timezone at
 * startup (runtime `process.env.TZ` reassignment does not take effect), so this
 * harness re-runs that spec once in a child process pinned to America/Los_Angeles
 * (west of UTC, where the two diverge). A regression from `formatDateOnlyUtc` back
 * to process-local derivation is then caught regardless of the outer runner's TZ.
 *
 * (The child runs only the named spec — not this harness — so there is no recursion.)
 */
describe('whole-day export timezone-independence (west-of-UTC harness)', () => {
  it('the whole-day-tz spec still passes under a non-UTC process timezone', () => {
    try {
      execFileSync('pnpm', ['exec', 'vitest', 'run', SPEC], {
        env: { ...process.env, TZ: 'America/Los_Angeles' },
        stdio: 'pipe',
        encoding: 'utf8',
      });
    } catch (error) {
      const e = error as { stdout?: string; stderr?: string };
      throw new Error(
        `whole-day-tz spec failed under TZ=America/Los_Angeles (a process-local date regression):\n${e.stdout ?? ''}${e.stderr ?? ''}`
      );
    }
  }, 60_000);
});
