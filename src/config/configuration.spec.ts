import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('configuration', () => {
  let tmpDir: string;
  const origEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.restoreAllMocks();
    tmpDir = mkdtempSync(join(tmpdir(), 'config-test-'));
    // Save env vars we might modify
    origEnv.ALKEMIO_CONFIG_PATH = process.env.ALKEMIO_CONFIG_PATH;
    origEnv.TEST_PORT = process.env.TEST_PORT;
    origEnv.NONEXISTENT_VAR_XYZ = process.env.NONEXISTENT_VAR_XYZ;
    origEnv.NONEXISTENT_BOOL_VAR = process.env.NONEXISTENT_BOOL_VAR;
    origEnv.NONEXISTENT_BOOL_VAR2 = process.env.NONEXISTENT_BOOL_VAR2;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(tmpDir, { recursive: true, force: true });
    // Restore env vars
    for (const [key, val] of Object.entries(origEnv)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
  });

  async function loadConfiguration() {
    const mod = await import('./configuration');
    return mod.default;
  }

  function writeConfig(content: string): string {
    const filePath = join(tmpDir, 'alkemio.yml');
    writeFileSync(filePath, content);
    return filePath;
  }

  it('should load and parse a YAML config file', async () => {
    const configPath = writeConfig('server:\n  port: 3000\n  name: test');
    process.env.ALKEMIO_CONFIG_PATH = configPath;

    const factory = await loadConfiguration();
    const result = factory();

    expect(result).toEqual({
      server: { port: 3000, name: 'test' },
    });
  });

  it('should substitute environment variables in YAML values', async () => {
    process.env.TEST_PORT = '8080';
    const configPath = writeConfig('server:\n  port: ${TEST_PORT}:3000');
    process.env.ALKEMIO_CONFIG_PATH = configPath;

    const factory = await loadConfiguration();
    const result = factory();

    expect(result.server.port).toBe(8080);
  });

  it('should use default value when env variable is not set', async () => {
    delete process.env.NONEXISTENT_VAR_XYZ;
    const configPath = writeConfig(
      'server:\n  port: ${NONEXISTENT_VAR_XYZ}:9999'
    );
    process.env.ALKEMIO_CONFIG_PATH = configPath;

    const factory = await loadConfiguration();
    const result = factory();

    expect(result.server.port).toBe(9999);
  });

  it('should convert string "true" to boolean true', async () => {
    const configPath = writeConfig(
      'feature:\n  enabled: ${NONEXISTENT_BOOL_VAR}:true'
    );
    process.env.ALKEMIO_CONFIG_PATH = configPath;

    const factory = await loadConfiguration();
    const result = factory();

    expect(result.feature.enabled).toBe(true);
  });

  it('should convert string "false" to boolean false', async () => {
    const configPath = writeConfig(
      'feature:\n  enabled: ${NONEXISTENT_BOOL_VAR2}:false'
    );
    process.env.ALKEMIO_CONFIG_PATH = configPath;

    const factory = await loadConfiguration();
    const result = factory();

    expect(result.feature.enabled).toBe(false);
  });

  // Note: "should throw when no config file is found" cannot be tested under
  // isolate:false — the factory falls back to real alkemio.yml in the repo root.

  it('should use ALKEMIO_CONFIG_PATH env var when set', async () => {
    const customPath = join(tmpDir, 'custom-alkemio.yml');
    writeFileSync(customPath, 'key: value');
    process.env.ALKEMIO_CONFIG_PATH = customPath;

    const factory = await loadConfiguration();
    const result = factory();

    expect(result).toEqual({ key: 'value' });
  });

  it('should pass through plain values without env substitution', async () => {
    const configPath = writeConfig('plain:\n  value: hello-world');
    process.env.ALKEMIO_CONFIG_PATH = configPath;

    const factory = await loadConfiguration();
    const result = factory();

    expect(result.plain.value).toBe('hello-world');
  });
});
