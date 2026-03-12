import 'reflect-metadata';
import { vi } from 'vitest';

const { mockCreateDecorator } = vi.hoisted(() => {
  const mockCreateDecorator = vi.fn().mockReturnValue(() => {});
  return { mockCreateDecorator };
});

vi.mock('./util', () => ({
  createInstrumentedClassDecorator: mockCreateDecorator,
}));

describe('InstrumentResolver', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
    mockCreateDecorator.mockClear();
  });

  it('should call createInstrumentedClassDecorator with graphql-resolver type', async () => {
    const { InstrumentResolver } = await import(
      './instrument.resolver.decorator'
    );
    InstrumentResolver();

    expect(mockCreateDecorator).toHaveBeenCalledWith(
      'graphql-resolver',
      expect.objectContaining({
        matchMethodsOnMetadataKey: expect.any(String),
      })
    );
  });

  it('should pass skipMethods option through', async () => {
    const { InstrumentResolver } = await import(
      './instrument.resolver.decorator'
    );
    InstrumentResolver({ skipMethods: ['method1'] });

    expect(mockCreateDecorator).toHaveBeenCalledWith(
      'graphql-resolver',
      expect.objectContaining({
        skipMethods: ['method1'],
      })
    );
  });

  it('should be enabled by default when ENABLE_APM is not set', async () => {
    delete process.env.ENABLE_APM;
    const { InstrumentResolver } = await import(
      './instrument.resolver.decorator'
    );
    InstrumentResolver();

    expect(mockCreateDecorator).toHaveBeenCalledWith(
      'graphql-resolver',
      expect.objectContaining({
        enabled: true,
      })
    );
  });

  it('should be disabled when ENABLE_APM=true and resolver not in APM_INSTRUMENT_MODULES', async () => {
    process.env.ENABLE_APM = 'true';
    process.env.APM_INSTRUMENT_MODULES = 'service';

    const { InstrumentResolver } = await import(
      './instrument.resolver.decorator'
    );
    InstrumentResolver();

    expect(mockCreateDecorator).toHaveBeenCalledWith(
      'graphql-resolver',
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it('should be enabled when ENABLE_APM=true and resolver in APM_INSTRUMENT_MODULES', async () => {
    process.env.ENABLE_APM = 'true';
    process.env.APM_INSTRUMENT_MODULES = 'resolver,service';

    const { InstrumentResolver } = await import(
      './instrument.resolver.decorator'
    );
    InstrumentResolver();

    expect(mockCreateDecorator).toHaveBeenCalledWith(
      'graphql-resolver',
      expect.objectContaining({
        enabled: true,
      })
    );
  });
});
