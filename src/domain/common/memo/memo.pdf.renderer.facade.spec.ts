import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { MemoPdfRenderer } from './memo.pdf.renderer';

describe('MemoPdfRenderer façade', () => {
  const actor = Object.assign(new ActorContext(), { actorID: 'actor-1' });
  const resolveImage = vi.fn();
  const imageResolver = { bind: vi.fn(() => resolveImage) };
  const pdf = Buffer.from('%PDF-');
  const executor = { run: vi.fn(async () => pdf) };
  const renderer = new MemoPdfRenderer(imageResolver as any, executor as any);

  it('rejects oversized editor state before any worker is used', async () => {
    const error = await renderer
      .render(Buffer.alloc(1_000_001), 'bucket-1', actor)
      .catch(caught => caught);

    expect(error).toBeInstanceOf(ValidationException);
    expect(error.message).toBe(
      'Memo PDF supports at most 1,000,000 bytes of memo editor content'
    );
    expect(executor.run).not.toHaveBeenCalled();
  });

  it('runs the render in the executor with a resolver bound to the bucket and actor', async () => {
    const abort = new AbortController();
    const state = Buffer.from('state');

    await expect(
      renderer.render(state, 'bucket-1', actor, {
        signal: abort.signal,
        memoId: 'memo-1',
      })
    ).resolves.toBe(pdf);

    expect(imageResolver.bind).toHaveBeenCalledWith('bucket-1', actor);
    expect(executor.run).toHaveBeenCalledOnce();
    expect(executor.run).toHaveBeenCalledWith({
      state,
      resolveImage,
      actorId: 'actor-1',
      memoId: 'memo-1',
      signal: abort.signal,
    });
  });

  it('keeps the signing call shape: three arguments, no options', async () => {
    await renderer.render(Buffer.from('state'), 'bucket-1', actor);

    expect(executor.run).toHaveBeenCalledWith(
      expect.objectContaining({ memoId: undefined, signal: undefined })
    );
  });

  // The layout libraries must load only inside the worker. Walk the runtime
  // imports of the façade through every local module it reaches; type-only
  // imports are erased at compile time and do not count.
  it('never loads the layout libraries in the server process', () => {
    const runtimeImports = (file: string) => {
      const source = readFileSync(join(__dirname, file), 'utf8');
      return [
        ...[
          ...source.matchAll(/^import\s+(?!type\s)[\s\S]*?from\s+'([^']+)';/gm),
        ].map(match => match[1]),
        ...[...source.matchAll(/^import\s+'([^']+)';/gm)].map(
          match => match[1]
        ),
        ...[...source.matchAll(/require\('([^']+)'\)/g)].map(match => match[1]),
      ];
    };
    const visited = new Set<string>();
    const external = new Set<string>();
    const visit = (file: string) => {
      if (visited.has(file)) return;
      visited.add(file);
      for (const module of runtimeImports(file))
        if (module.startsWith('./') && !module.includes('/', 2))
          visit(`${module.slice(2)}.ts`);
        else external.add(module);
    };
    visit('memo.pdf.renderer.ts');

    expect(visited).toContain('memo.pdf.executor.ts');
    expect(visited).toContain('memo.pdf.image.resolver.ts');
    expect(visited).not.toContain('memo.pdf.render.core.ts');
    expect(visited).not.toContain('memo.pdf.fonts.ts');
    for (const module of external)
      expect(module).not.toMatch(/^(jsdom|pdfmake|html-to-pdfmake)(\/|$)/);
  });
});
