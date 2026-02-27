import os from 'os';
import pathLib from 'path';
import { pathResolve } from './path.resolve';

describe('pathResolve', () => {
  it('should return the current working directory for an empty string', () => {
    expect(pathResolve('')).toBe(process.cwd());
  });

  it('should return an absolute path unchanged', () => {
    expect(pathResolve('/usr/local/bin')).toBe('/usr/local/bin');
  });

  it('should resolve a tilde path to the home directory', () => {
    const result = pathResolve('~/documents');
    expect(result).toBe(pathLib.join(os.homedir(), 'documents'));
  });

  it('should resolve a relative path against the current working directory', () => {
    const result = pathResolve('src/index.ts');
    expect(result).toBe(pathLib.resolve(process.cwd(), 'src/index.ts'));
  });

  it('should handle relative paths with parent directory references', () => {
    const result = pathResolve('../sibling/file.txt');
    expect(result).toBe(pathLib.resolve(process.cwd(), '../sibling/file.txt'));
  });

  it('should handle tilde-only path', () => {
    const result = pathResolve('~');
    expect(result).toBe(os.homedir());
  });

  it('should handle a path starting with dot-slash', () => {
    const result = pathResolve('./local/file');
    expect(result).toBe(pathLib.resolve(process.cwd(), './local/file'));
  });
});
