import * as fs from 'fs';
import { vi } from 'vitest';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

const mockExistsSync = vi.mocked(fs.existsSync);
const mockReadFileSync = vi.mocked(fs.readFileSync);

describe('configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    mockExistsSync.mockReset();
    mockReadFileSync.mockReset();
  });

  async function loadConfiguration() {
    const mod = await import('./configuration');
    return mod.default;
  }

  it('should load and parse a YAML config file', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('server:\n  port: 3000\n  name: test');

    const factory = await loadConfiguration();
    const result = factory();

    expect(result).toEqual({
      server: { port: 3000, name: 'test' },
    });
  });

  it('should substitute environment variables in YAML values', async () => {
    const originalEnv = process.env.TEST_PORT;
    process.env.TEST_PORT = '8080';

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('server:\n  port: ${TEST_PORT}:3000');

    const factory = await loadConfiguration();
    const result = factory();

    expect(result.server.port).toBe(8080);

    if (originalEnv === undefined) {
      delete process.env.TEST_PORT;
    } else {
      process.env.TEST_PORT = originalEnv;
    }
  });

  it('should use default value when env variable is not set', async () => {
    delete process.env.NONEXISTENT_VAR_XYZ;

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      'server:\n  port: ${NONEXISTENT_VAR_XYZ}:9999'
    );

    const factory = await loadConfiguration();
    const result = factory();

    expect(result.server.port).toBe(9999);
  });

  it('should convert string "true" to boolean true', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      'feature:\n  enabled: ${NONEXISTENT_BOOL_VAR}:true'
    );

    const factory = await loadConfiguration();
    const result = factory();

    expect(result.feature.enabled).toBe(true);
  });

  it('should convert string "false" to boolean false', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      'feature:\n  enabled: ${NONEXISTENT_BOOL_VAR2}:false'
    );

    const factory = await loadConfiguration();
    const result = factory();

    expect(result.feature.enabled).toBe(false);
  });

  it('should throw when no config file is found', async () => {
    mockExistsSync.mockReturnValue(false);

    const factory = await loadConfiguration();

    expect(() => factory()).toThrow('Unable to locate alkemio.yml');
  });

  it('should use ALKEMIO_CONFIG_PATH env var when set', async () => {
    const originalPath = process.env.ALKEMIO_CONFIG_PATH;
    process.env.ALKEMIO_CONFIG_PATH = '/custom/path/alkemio.yml';

    mockExistsSync.mockImplementation(
      (p: any) => p === '/custom/path/alkemio.yml'
    );
    mockReadFileSync.mockReturnValue('key: value');

    const factory = await loadConfiguration();
    const result = factory();

    expect(result).toEqual({ key: 'value' });
    expect(mockExistsSync).toHaveBeenCalledWith('/custom/path/alkemio.yml');

    if (originalPath === undefined) {
      delete process.env.ALKEMIO_CONFIG_PATH;
    } else {
      process.env.ALKEMIO_CONFIG_PATH = originalPath;
    }
  });

  it('should pass through plain values without env substitution', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('plain:\n  value: hello-world');

    const factory = await loadConfiguration();
    const result = factory();

    expect(result.plain.value).toBe('hello-world');
  });
});
