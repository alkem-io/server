import os from 'os';
import { untildify } from './untildify';

describe('untildify', () => {
  const homeDir = os.homedir();

  it('should replace tilde at the start with home directory', () => {
    expect(untildify('~/documents')).toBe(`${homeDir}/documents`);
  });

  it('should replace standalone tilde with home directory', () => {
    expect(untildify('~')).toBe(homeDir);
  });

  it('should replace tilde followed by backslash', () => {
    expect(untildify('~\\Windows\\path')).toBe(`${homeDir}\\Windows\\path`);
  });

  it('should not replace tilde in the middle of a path', () => {
    expect(untildify('/some/path/~file')).toBe('/some/path/~file');
  });

  it('should not replace tilde when not followed by separator or end of string', () => {
    expect(untildify('~username/files')).toBe('~username/files');
  });

  it('should return the path unchanged when it does not start with tilde', () => {
    expect(untildify('/absolute/path')).toBe('/absolute/path');
    expect(untildify('relative/path')).toBe('relative/path');
  });

  it('should handle empty string', () => {
    expect(untildify('')).toBe('');
  });

  it('should handle nested directories after tilde', () => {
    expect(untildify('~/a/b/c/d')).toBe(`${homeDir}/a/b/c/d`);
  });
});
