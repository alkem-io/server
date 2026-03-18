import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Uses CLI entry to validate scalar jsonType classification logic.

describe('schema diff scalars', () => {
  const tool = 'src/tools/schema/diff-schema.ts';

  function run(oldSDL: string, newSDL: string) {
    const dir = mkdtempSync(join(tmpdir(), 'schema-diff-scalar-'));
    const oldPath = join(dir, 'old.graphql');
    const newPath = join(dir, 'new.graphql');
    const outPath = join(dir, 'report.json');
    const depPath = join(dir, 'deprecations.json');
    writeFileSync(oldPath, oldSDL);
    writeFileSync(newPath, newSDL);
    execSync(
      `npx ts-node -r tsconfig-paths/register ${tool} --old ${oldPath} --new ${newPath} --out ${outPath} --deprecations ${depPath}`
    );
    return JSON.parse(readFileSync(outPath, 'utf8'));
  }

  it('captures additive scalar with NON_BREAKING evaluation', () => {
    const report = run(
      'scalar Date\n\n type Query { now: Date }',
      'scalar Date\nscalar JSONAny\n\n type Query { now: Date, any: JSONAny }'
    );
    const evalObj = report.scalarEvaluations.find(
      (e: any) => e.scalarName === 'JSONAny'
    );
    expect(evalObj).toBeTruthy();
    expect(evalObj.behaviorChangeClassification).toBe('NON_BREAKING');
    expect(
      report.entries.some(
        (e: any) => e.element === 'JSONAny' && e.changeType === 'ADDITIVE'
      )
    ).toBe(true);
  });

  it('classifies scalar jsonType change as BREAKING', () => {
    // Provide explicit directive for old type, change directive in new
    const report = run(
      'directive @scalarMeta(jsonType: String) on SCALAR\nscalar Payload @scalarMeta(jsonType: "object")\n\n type Query { p: Payload }',
      'directive @scalarMeta(jsonType: String) on SCALAR\nscalar Payload @scalarMeta(jsonType: "string")\n\n type Query { p: Payload }'
    );
    const breakingEntry = report.entries.find(
      (e: any) =>
        e.element === 'Payload' &&
        e.changeType === 'BREAKING' &&
        e.detail.includes('JSON type category changed')
    );
    expect(breakingEntry).toBeTruthy();
    const evalObj = report.scalarEvaluations.find(
      (e: any) => e.scalarName === 'Payload'
    );
    expect(evalObj.behaviorChangeClassification).toBe('BREAKING');
  });

  it('treats description-only scalar change as INFO with NON_BREAKING evaluation', () => {
    const report = run(
      'scalar UUID\n\n type Query { id: UUID }',
      '"Unique id"\nscalar UUID\n\n type Query { id: UUID }'
    );
    const infoEntry = report.entries.find(
      (e: any) => e.element === 'UUID' && e.changeType === 'INFO'
    );
    expect(infoEntry).toBeTruthy();
    const evalObj = report.scalarEvaluations.find(
      (e: any) => e.scalarName === 'UUID'
    );
    expect(evalObj.behaviorChangeClassification).toBe('NON_BREAKING');
  });
});
