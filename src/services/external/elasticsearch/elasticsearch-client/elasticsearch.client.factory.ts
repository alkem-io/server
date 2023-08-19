import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { ConfigurationTypes } from '@common/enums';

export const elasticSearchClientFactory = (
  logger: LoggerService,
  configService: ConfigService
): Client | undefined => {
  const elasticsearch = configService.get(
    ConfigurationTypes.INTEGRATIONS
  )?.elasticsearch;

  const { host, retries, timeout, api_key, tls } = elasticsearch;
  const rejectUnauthorized = tls.rejectUnauthorized ?? false;

  if (!host) {
    logger.warn('Elasticsearch host URL not provided!');
    return undefined;
  }

  if (!api_key) {
    logger.error('Elasticsearch API key not provided!');
    return undefined;
  }

  return new Client({
    node: host,
    maxRetries: retries,
    requestTimeout: timeout,
    resurrectStrategy: 'ping',
    auth: { apiKey: api_key },
    tls: { rejectUnauthorized },
  });
};
