import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

describe('whiteboard-executor native CJS semantic boundary', () => {
  it('real published preparation keeps sync replies private until GO and late-invalid sends nothing', () => {
    expect(() =>
      execFileSync(
        process.execPath,
        [
          '-r',
          'ts-node/register/transpile-only',
          '-r',
          'tsconfig-paths/register',
          resolve('test/fixtures/whiteboard-executor-native.cjs'),
        ],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            TS_NODE_COMPILER_OPTIONS: JSON.stringify({
              rootDir: process.cwd(),
            }),
          },
          timeout: 30000,
          stdio: 'pipe',
        }
      )
    ).not.toThrow();
  });
});
