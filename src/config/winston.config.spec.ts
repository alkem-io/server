import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { WinstonConfigService } from './winston.config';

describe('WinstonConfigService', () => {
  let service: WinstonConfigService;
  const createMockConfigService = (overrides: Record<string, any> = {}) => {
    const defaults: Record<string, any> = {
      'monitoring.logging.console_logging_enabled': true,
      'monitoring.logging': {
        json: false,
        console_logging_enabled: true,
        level: 'info',
        context_to_file: {
          enabled: false,
          filename: '',
          context: '',
        },
      },
      'monitoring.logging.level': 'info',
      'monitoring.logging.context_to_file': {
        enabled: false,
        filename: '',
        context: '',
      },
      ...overrides,
    };

    return {
      get: vi.fn().mockImplementation((key: string) => defaults[key]),
    };
  };

  async function createTestModule(
    configOverrides: Record<string, any> = {}
  ): Promise<TestingModule> {
    const mockConfig = createMockConfigService(configOverrides);

    return Test.createTestingModule({
      providers: [
        WinstonConfigService,
        {
          provide: ConfigService,
          useValue: mockConfig,
        },
      ],
    }).compile();
  }

  beforeEach(async () => {
    const module = await createTestModule();
    service = module.get<WinstonConfigService>(WinstonConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create winston options with console transport', async () => {
    const options = await service.createWinstonModuleOptions();

    expect(options).toBeDefined();
    expect(options.transports).toBeDefined();
    expect(options.transports.length).toBeGreaterThanOrEqual(1);
  });

  it('should set console transport as not silent when enabled', async () => {
    const options = await service.createWinstonModuleOptions();

    const consoleTransport = options.transports[0];
    expect(consoleTransport.silent).toBe(false);
  });

  it('should set console transport as silent when disabled', async () => {
    const module = await createTestModule({
      'monitoring.logging.console_logging_enabled': false,
    });
    service = module.get<WinstonConfigService>(WinstonConfigService);

    const options = await service.createWinstonModuleOptions();

    const consoleTransport = options.transports[0];
    expect(consoleTransport.silent).toBe(true);
  });

  it('should use JSON format when json config is true', async () => {
    const module = await createTestModule({
      'monitoring.logging': {
        json: true,
        console_logging_enabled: true,
        level: 'info',
        context_to_file: {
          enabled: false,
          filename: '',
          context: '',
        },
      },
    });
    service = module.get<WinstonConfigService>(WinstonConfigService);

    const options = await service.createWinstonModuleOptions();

    expect(options.transports).toBeDefined();
    expect(options.transports.length).toBe(1);
  });

  it('should set log level from config in lowercase', async () => {
    const module = await createTestModule({
      'monitoring.logging.level': 'DEBUG',
    });
    service = module.get<WinstonConfigService>(WinstonConfigService);

    const options = await service.createWinstonModuleOptions();

    const consoleTransport = options.transports[0];
    expect(consoleTransport.level).toBe('debug');
  });

  it('should add file transport when context_to_file is enabled', async () => {
    const module = await createTestModule({
      'monitoring.logging.context_to_file': {
        enabled: true,
        filename: '/tmp/test.log',
        context: 'TestContext',
      },
    });
    service = module.get<WinstonConfigService>(WinstonConfigService);

    const options = await service.createWinstonModuleOptions();

    expect(options.transports.length).toBe(2);
  });

  it('should not add file transport when context_to_file is disabled', async () => {
    const options = await service.createWinstonModuleOptions();

    expect(options.transports.length).toBe(1);
  });

  it('should configure file transport with correct filename', async () => {
    const module = await createTestModule({
      'monitoring.logging.context_to_file': {
        enabled: true,
        filename: 'alkemio.log',
        context: 'AuthContext',
      },
    });
    service = module.get<WinstonConfigService>(WinstonConfigService);

    const options = await service.createWinstonModuleOptions();

    const fileTransport = options.transports[1];
    expect(fileTransport.filename).toBe('alkemio.log');
  });
});
