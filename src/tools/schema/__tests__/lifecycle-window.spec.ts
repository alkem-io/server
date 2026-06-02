import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/** Utility to run the diff tool. */
function runDiff(opts: {
  old?: string; // if omitted baseline
  next: string;
  out: string;
  deps: string;
}) {
  const args = [
    'npx',
    'ts-node',
    '-r',
    'tsconfig-paths/register',
    'src/tools/schema/diff-schema.ts',
    '--new',
    opts.next,
    '--out',
    opts.out,
    '--deprecations',
    opts.deps,
  ];
  if (opts.old) {
    args.push('--old', opts.old);
  }
  execSync(args.join(' '), { stdio: 'inherit' });
}

function readReport(p: string) {
  return JSON.parse(readFileSync(p, 'utf-8'));
}

function writeSchema(p: string, sdl: string) {
  writeFileSync(p, sdl.trim() + '\n');
}

/**
 * Returns an ISO `YYYY-MM-DD` date `n` days from today (negative = past).
 * All fixture dates are computed relative to `new Date()` so these tests are
 * calendar-independent and never expire (no hardcoded "time-bomb" literals).
 */
const isoDaysFromNow = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

describe('FR-005/011/012 deprecation lifecycle enforcement', () => {
  const tmpRoot = mkdtempSync(path.join(os.tmpdir(), 'schema-lifecycle-'));
  const reportPath = path.join(tmpRoot, 'change-report.json');
  const depsPath = path.join(tmpRoot, 'deprecations.json');

  afterAll(() => {
    try {
      rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it('flags invalid short removal window on new deprecation (<90 days)', () => {
    const oldSchema = 'type Query { hello: String }';
    const shortWindow = new Date();
    shortWindow.setDate(shortWindow.getDate() + 25); // 25 days ahead
    const removeAfterStr = shortWindow.toISOString().slice(0, 10);
    const newSchema = `type Query { hello: String @deprecated(reason: "REMOVE_AFTER=${removeAfterStr} | cleanup") }`;
    const oldPath = path.join(tmpRoot, 'short-old.graphql');
    const newPath = path.join(tmpRoot, 'short-new.graphql');
    writeSchema(oldPath, oldSchema);
    writeSchema(newPath, newSchema);
    runDiff({ old: oldPath, next: newPath, out: reportPath, deps: depsPath });
    const report = readReport(reportPath);
    const entry = report.entries.find((e: any) => e.element === 'Query.hello');
    expect(entry).toBeTruthy();
    expect(entry.changeType).toBe('INVALID_DEPRECATION_FORMAT');
    expect(entry.detail).toMatch(/Removal window <90 days/);
  });

  it('classifies premature removal before removeAfter as PREMATURE_REMOVAL', () => {
    // Prepare baseline with deprecated field (valid window).
    // removeAfter is comfortably in the FUTURE so removing the field now is
    // genuinely premature; sinceDate is far enough in the past that the
    // original deprecation window itself was valid (>= 90 days).
    const sinceDate = isoDaysFromNow(-240);
    const removeAfter = isoDaysFromNow(120); // future relative to today
    const deprecatedSchema = `type Query {
      hello: String @deprecated(reason: "REMOVE_AFTER=${removeAfter} | cleanup")
    }`;
    const followupSchema = 'type Query { hello2: String }'; // remove deprecated field prematurely
    const oldPath = path.join(tmpRoot, 'premature-old.graphql');
    const newPath = path.join(tmpRoot, 'premature-new.graphql');
    writeSchema(oldPath, deprecatedSchema);
    // Seed prior deprecations registry to supply real sinceDate
    writeFileSync(
      depsPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          entries: [
            {
              element: 'Query.hello',
              elementType: 'FIELD',
              sinceDate,
              removeAfter,
              humanReason: 'cleanup',
              formatValid: true,
              retired: false,
              firstCommit: 'abc123',
            },
          ],
        },
        null,
        2
      )
    );
    writeSchema(newPath, followupSchema);
    runDiff({ old: oldPath, next: newPath, out: reportPath, deps: depsPath });
    const report = readReport(reportPath);
    const removal = report.entries.find(
      (e: any) =>
        e.element === 'Query.hello' &&
        (e.changeType === 'PREMATURE_REMOVAL' || e.changeType === 'BREAKING')
    );
    expect(removal).toBeTruthy();
    expect(removal.changeType).toBe('PREMATURE_REMOVAL');
    expect(removal.detail).toMatch(/Field removal premature/);
  });

  it('classifies removal after removeAfter but <90 elapsed days as INFO', () => {
    // removeAfter is in the PAST (window met) and fewer than 90 days ago, while
    // sinceDate is far enough back that the deprecation has been live >= 90 days
    // — so retirement is valid and classified INFO ("retired after window").
    const sinceDate = isoDaysFromNow(-150);
    const removeAfter = isoDaysFromNow(-30); // past, but < 90 days ago
    const deprecatedSchema = `type Query { hello: String @deprecated(reason: "REMOVE_AFTER=${removeAfter} | cleanup") }`;
    const removalSchema = 'type Query { other: String }';
    const oldPath = path.join(tmpRoot, 'breaking-old.graphql');
    const newPath = path.join(tmpRoot, 'breaking-new.graphql');
    writeSchema(oldPath, deprecatedSchema);
    writeFileSync(
      depsPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          entries: [
            {
              element: 'Query.hello',
              elementType: 'FIELD',
              sinceDate,
              removeAfter,
              humanReason: 'cleanup',
              formatValid: true,
              retired: false,
              firstCommit: 'def456',
            },
          ],
        },
        null,
        2
      )
    );
    writeSchema(newPath, removalSchema);
    runDiff({ old: oldPath, next: newPath, out: reportPath, deps: depsPath });
    const report = readReport(reportPath);
    const removal = report.entries.find(
      (e: any) => e.element === 'Query.hello'
    );
    expect(removal).toBeTruthy();
    expect(removal.changeType).toBe('INFO');
    expect(removal.detail).toMatch(/retired after deprecation window/);
  });

  it('classifies valid retirement (after removeAfter & >=90 days) as INFO', () => {
    // Fully valid retirement: removeAfter well in the past AND the deprecation
    // has been live for >= 90 days (window met + min-days met → INFO).
    const sinceDate = isoDaysFromNow(-300);
    const removeAfter = isoDaysFromNow(-200);
    const deprecatedSchema = `type Query { hello: String @deprecated(reason: "REMOVE_AFTER=${removeAfter} | cleanup") }`;
    const retirementSchema = 'type Query { other: String }';
    const oldPath = path.join(tmpRoot, 'retire-old.graphql');
    const newPath = path.join(tmpRoot, 'retire-new.graphql');
    writeSchema(oldPath, deprecatedSchema);
    writeFileSync(
      depsPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          entries: [
            {
              element: 'Query.hello',
              elementType: 'FIELD',
              sinceDate,
              removeAfter,
              humanReason: 'cleanup',
              formatValid: true,
              retired: false,
              firstCommit: 'ghi789',
            },
          ],
        },
        null,
        2
      )
    );
    writeSchema(newPath, retirementSchema);
    runDiff({ old: oldPath, next: newPath, out: reportPath, deps: depsPath });
    const report = readReport(reportPath);
    const retirement = report.entries.find(
      (e: any) => e.element === 'Query.hello'
    );
    expect(retirement).toBeTruthy();
    expect(retirement.changeType).toBe('INFO');
    expect(retirement.detail).toMatch(/retired after deprecation window/);
    // Ensure deprecations registry now marks retired
    const deps = JSON.parse(readFileSync(depsPath, 'utf-8'));
    const entry = deps.entries.find((e: any) => e.element === 'Query.hello');
    expect(entry).toBeTruthy();
    expect(entry.retired).toBe(true);
  });
});
