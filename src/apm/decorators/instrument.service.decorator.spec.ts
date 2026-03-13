import { vi } from 'vitest';

const { mockCreateDecorator } = vi.hoisted(() => {
  const mockCreateDecorator = vi.fn().mockReturnValue(() => {});
  return { mockCreateDecorator };
});

vi.mock('./util', () => ({
  createInstrumentedClassDecorator: mockCreateDecorator,
}));

describe('InstrumentService', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
    mockCreateDecorator.mockClear();
  });

  it('should call createInstrumentedClassDecorator with service-call type', async () => {
    const { InstrumentService } = await import(
      './instrument.service.decorator'
    );
    InstrumentService();

    expect(mockCreateDecorator).toHaveBeenCalledWith(
      'service-call',
      expect.objectContaining({
        enabled: expect.any(Boolean),
      })
    );
  });

  it('should pass skipMethods option through', async () => {
    const { InstrumentService } = await import(
      './instrument.service.decorator'
    );
    InstrumentService({ skipMethods: ['method1'] });

    expect(mockCreateDecorator).toHaveBeenCalledWith(
      'service-call',
      expect.objectContaining({
        skipMethods: ['method1'],
      })
    );
  });

  it('should be enabled by default when ENABLE_APM is not set', async () => {
    delete process.env.ENABLE_APM;
    const { InstrumentService } = await import(
      './instrument.service.decorator'
    );
    InstrumentService();

    expect(mockCreateDecorator).toHaveBeenCalledWith(
      'service-call',
      expect.objectContaining({
        enabled: true,
      })
    );
  });

  it('should be disabled when ENABLE_APM=true and service not in APM_INSTRUMENT_MODULES', async () => {
    process.env.ENABLE_APM = 'true';
    process.env.APM_INSTRUMENT_MODULES = 'resolver';

    const { InstrumentService } = await import(
      './instrument.service.decorator'
    );
    InstrumentService();

    expect(mockCreateDecorator).toHaveBeenCalledWith(
      'service-call',
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it('should be enabled when ENABLE_APM=true and service in APM_INSTRUMENT_MODULES', async () => {
    process.env.ENABLE_APM = 'true';
    process.env.APM_INSTRUMENT_MODULES = 'resolver,service';

    const { InstrumentService } = await import(
      './instrument.service.decorator'
    );
    InstrumentService();

    expect(mockCreateDecorator).toHaveBeenCalledWith(
      'service-call',
      expect.objectContaining({
        enabled: true,
      })
    );
  });
});
