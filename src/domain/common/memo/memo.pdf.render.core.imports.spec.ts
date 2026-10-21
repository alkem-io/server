import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The render core runs inside the forked worker, which has no Nest container,
// no database and no file-service client. Its imports must therefore stay free
// of dependency-injected storage, authorization and adapter code.
describe('memo PDF render core imports', () => {
  const source = readFileSync(
    join(__dirname, 'memo.pdf.render.core.ts'),
    'utf8'
  );
  const imports = [
    ...source.matchAll(/^import\s+(type\s+)?[\s\S]*?from\s+'([^']+)';/gm),
  ].map(match => ({ typeOnly: Boolean(match[1]), from: match[2] }));
  const requires = [...source.matchAll(/require\('([^']+)'\)/g)].map(
    match => match[1]
  );

  it('imports nothing from storage, authorization or the service adapters', () => {
    const modules = [...imports.map(entry => entry.from), ...requires];
    expect(modules.length).toBeGreaterThan(0);
    for (const module of modules)
      expect(module).not.toMatch(
        /^@domain\/storage|^@core\/authorization|^@services\/adapters/
      );
  });

  it('imports Nest only for types', () => {
    for (const entry of imports.filter(({ from }) =>
      from.startsWith('@nestjs/')
    ))
      expect(entry.typeOnly).toBe(true);
  });
});
