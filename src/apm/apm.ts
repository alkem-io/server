import apm from 'elastic-apm-node';

const API_KEY = process.env.ELASTICSEARCH_API_KEY;
const SERVER_URL = process.env.ELASTICSEARCH_URL;
const TRANSACTION_SAMPLE_RATE_PERCENTAGE = 100;
const CERTIFICATE_PATH =
  process.env.ELASTIC_TLS_CA_CERT_PATH === 'none'
    ? undefined
    : process.env.ELASTIC_TLS_CA_CERT_PATH;

export const apmAgent = apm.start({
  // https://www.elastic.co/guide/en/apm/agent/nodejs/4.x/configuration.html
  active: process.env.NODE_ENV === 'production',
  serviceName: process.env.npm_package_name,
  serviceVersion: process.env.npm_package_version,
  apiKey: API_KEY,
  serverUrl: SERVER_URL,
  verifyServerCert: !!CERTIFICATE_PATH,
  serverCaCertFile: CERTIFICATE_PATH,
  environment: 'local',
  /**
   * Specify the sampling rate to use when deciding whether to trace a request.
   * This must be a value between 0.0 and 1.0, where 1.0 means 100% of requests are traced.
   * The value is rounded to four decimal places of precision (e.g. 0.0001, 0.3333) to ensure consistency and reasonable size
   * when propagating the sampling rate in the tracestate header for distributed tracing.
   *
   */
  transactionSampleRate: TRANSACTION_SAMPLE_RATE_PERCENTAGE / 100,
  /**
   * Setting this option to false will disable the Span compression feature.
   * Span compression reduces the collection, processing, and storage overhead,
   * and removes clutter from the UI. The tradeoff is that some information,
   * such as DB statements of all the compressed spans, will not be collected.
   */
  spanCompressionEnabled: true,
  /**
   * Consecutive spans to the same destination that are under this threshold will be compressed into a single composite span.
   * This option does not apply to composite spans. This reduces the collection, processing,
   * and storage overhead, and removes clutter from the UI.
   * The tradeoff is that the DB statements of all the compressed spans will not be collected.
   */
  spanCompressionSameKindMaxDuration: '30ms',
  /**
   * Consecutive spans that are exact match and that are under this threshold will be compressed into a single composite span.
   * This option does not apply to composite spans. This reduces the collection, processing, and storage overhead, and removes clutter from the UI.
   * The tradeoff is that the DB statements of all the compressed spans will not be collected.
   */
  spanCompressionExactMatchMaxDuration: '50ms',
});
