import { vi } from 'vitest';

const { mockStart } = vi.hoisted(() => {
  const mockStart = vi.fn().mockReturnValue({ mock: true });
  return { mockStart };
});

vi.mock('elastic-apm-node', () => ({
  default: {
    start: mockStart,
  },
}));

describe('apm agent initialization', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('should export apmAgent as undefined when APM_ENDPOINT is not set', async () => {
    delete process.env.APM_ENDPOINT;
    const { apmAgent } = await import('./apm');
    expect(apmAgent).toBeUndefined();
  });

  it('should call apm.start when APM_ENDPOINT is set', async () => {
    process.env.APM_ENDPOINT = 'http://apm:8200';
    process.env.APM_ACTIVE = 'true';
    process.env.APM_TRANSACTION_PERCENTAGE = '50';
    process.env.ENVIRONMENT = 'test';
    process.env.ELASTIC_TLS_CA_CERT_PATH = 'none';

    const { apmAgent } = await import('./apm');

    expect(mockStart).toHaveBeenCalled();
    expect(apmAgent).toBeDefined();

    const callArgs = mockStart.mock.calls[0][0];
    expect(callArgs.active).toBe(true);
    expect(callArgs.serverUrl).toBe('http://apm:8200');
    expect(callArgs.transactionSampleRate).toBe(0.5);
    expect(callArgs.environment).toBe('test');
    expect(callArgs.verifyServerCert).toBe(false);
    expect(callArgs.serverCaCertFile).toBeUndefined();
  });

  it('should set verifyServerCert to true when certificate path is provided', async () => {
    process.env.APM_ENDPOINT = 'http://apm:8200';
    process.env.ELASTIC_TLS_CA_CERT_PATH = '/path/to/cert.pem';

    const { apmAgent } = await import('./apm');

    expect(apmAgent).toBeDefined();
    const callArgs = mockStart.mock.calls[0][0];
    expect(callArgs.verifyServerCert).toBe(true);
    expect(callArgs.serverCaCertFile).toBe('/path/to/cert.pem');
  });

  it('should default transaction sample rate to 1.0 when APM_TRANSACTION_PERCENTAGE is not set', async () => {
    process.env.APM_ENDPOINT = 'http://apm:8200';
    delete process.env.APM_TRANSACTION_PERCENTAGE;

    await import('./apm');

    const callArgs = mockStart.mock.calls[0][0];
    expect(callArgs.transactionSampleRate).toBe(1);
  });
});
