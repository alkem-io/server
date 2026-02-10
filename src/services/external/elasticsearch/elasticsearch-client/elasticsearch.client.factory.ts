import { LogContext } from '@common/enums';
import { Client } from '@elastic/elasticsearch';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import fs from 'fs';

export const elasticSearchClientFactory = async (
  logger: LoggerService,
  configService: ConfigService<AlkemioConfig, true>
): Promise<Client | undefined> => {
  const elasticsearch = configService.get('integrations.elasticsearch', {
    infer: true,
  });

  const { host, retries, timeout, api_key, tls } = elasticsearch;
  if (!host || host.length === 0) {
    logger.verbose?.(
      'Elasticsearch host URL not provided, not creating client.',
      LogContext.ELASTIC_SEARCH
    );
    return undefined;
  }
  const rejectUnauthorized = tls.rejectUnauthorized ?? false;
  let tlsOptions;

  // Ensure the path to the certificate inside the container is correct
  if (tls.ca_cert_path === 'none') {
    tlsOptions = { rejectUnauthorized };
  } else {
    // This should match the mountPath in your Kubernetes deployment YAML
    const certPath = tls.ca_cert_path;
    if (!fs.existsSync(certPath)) {
      logger.error(
        `Certificate not found at path: ${certPath}`,
        LogContext.ELASTIC_SEARCH
      );
      return undefined;
    }
    const cert = fs.readFileSync(certPath);
    tlsOptions = {
      rejectUnauthorized: true,
      ca: cert,
    };
  }

  if (!api_key) {
    logger.error(
      'Elasticsearch API key not provided!',
      LogContext.ELASTIC_SEARCH
    );
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
