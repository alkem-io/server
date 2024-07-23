import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { ConfigurationTypes } from '@common/enums';
import fs from 'fs';

export const elasticSearchClientFactory = async (
  logger: LoggerService,
  configService: ConfigService
): Promise<Client | undefined> => {
  const elasticsearch = configService.get(
    ConfigurationTypes.INTEGRATIONS
  )?.elasticsearch;

  const { host, retries, timeout, api_key, tls } = elasticsearch;
  const rejectUnauthorized = tls.rejectUnauthorized ?? false;
  let tlsOptions;

  // Ensure the path to the certificate inside the container is correct
  if (tls.ca_cert_path === 'none') {
    tlsOptions = { rejectUnauthorized };
  } else {
    // This should match the mountPath in your Kubernetes deployment YAML
    const certPath = tls.ca_cert_path;
    if (!fs.existsSync(certPath)) {
      logger.error(`Certificate not found at path: ${certPath}`);
      return undefined;
    }
    const cert = fs.readFileSync(certPath);
    tlsOptions = {
      rejectUnauthorized: true,
      ca: cert,
    };
  }

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
    tls: tlsOptions,
  });
};
