import { LogContext } from '@common/enums';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fs from 'fs';
import { vi } from 'vitest';
import { elasticSearchClientFactory } from './elasticsearch.client.factory';

vi.mock('@elastic/elasticsearch', () => {
  return {
    Client: class MockClient {
      constructor(public _options: unknown) {}
    },
  };
});

describe('elasticSearchClientFactory', () => {
  let logger: LoggerService;
  let configService: ConfigService;

  const baseElasticsearchConfig = {
    host: 'https://localhost:9200',
    retries: 3,
    timeout: 5000,
    api_key: 'test-api-key',
    tls: {
      rejectUnauthorized: false,
      ca_cert_path: 'none',
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    logger = {
      verbose: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };
    configService = {
      get: vi.fn().mockReturnValue(baseElasticsearchConfig),
    } as unknown as ConfigService;
  });

  it('should return undefined when host is not provided', async () => {
    vi.mocked(configService.get).mockReturnValue({
      ...baseElasticsearchConfig,
      host: '',
    });

    const result = await elasticSearchClientFactory(
      logger,
      configService as any
    );

    expect(result).toBeUndefined();
    expect(logger.verbose).toHaveBeenCalledWith(
      'Elasticsearch host URL not provided, not creating client.',
      LogContext.ELASTIC_SEARCH
    );
  });

  it('should return undefined when host is undefined', async () => {
    vi.mocked(configService.get).mockReturnValue({
      ...baseElasticsearchConfig,
      host: undefined,
    });

    const result = await elasticSearchClientFactory(
      logger,
      configService as any
    );

    expect(result).toBeUndefined();
  });

  it('should return undefined when api_key is not provided', async () => {
    vi.mocked(configService.get).mockReturnValue({
      ...baseElasticsearchConfig,
      api_key: '',
    });

    const result = await elasticSearchClientFactory(
      logger,
      configService as any
    );

    expect(result).toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      'Elasticsearch API key not provided!',
      LogContext.ELASTIC_SEARCH
    );
  });

  it('should create client with TLS skip when ca_cert_path is "none"', async () => {
    const result = await elasticSearchClientFactory(
      logger,
      configService as any
    );

    expect(result).toBeDefined();
  });

  it('should return undefined when cert file does not exist', async () => {
    vi.mocked(configService.get).mockReturnValue({
      ...baseElasticsearchConfig,
      tls: {
        rejectUnauthorized: true,
        ca_cert_path: '/path/to/cert.pem',
      },
    });
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);

    const result = await elasticSearchClientFactory(
      logger,
      configService as any
    );

    expect(result).toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      'Certificate not found at path: /path/to/cert.pem',
      LogContext.ELASTIC_SEARCH
    );
  });

  it('should create client with TLS cert when cert file exists', async () => {
    vi.mocked(configService.get).mockReturnValue({
      ...baseElasticsearchConfig,
      tls: {
        rejectUnauthorized: true,
        ca_cert_path: '/path/to/cert.pem',
      },
    });
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('cert-content'));

    const result = await elasticSearchClientFactory(
      logger,
      configService as any
    );

    expect(result).toBeDefined();
    expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/cert.pem');
  });

  it('should use default rejectUnauthorized=false when tls.rejectUnauthorized is undefined', async () => {
    vi.mocked(configService.get).mockReturnValue({
      ...baseElasticsearchConfig,
      tls: {
        ca_cert_path: 'none',
      },
    });

    const result = await elasticSearchClientFactory(
      logger,
      configService as any
    );

    expect(result).toBeDefined();
  });
});
