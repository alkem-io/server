import apm from 'elastic-apm-node';

const TRANSACTION_SAMPLE_RATE =
  Number(process.env.APM_TRANSACTION_PERCENTAGE ?? 100) / 100;
const CERTIFICATE_PATH =
  process.env.ELASTIC_TLS_CA_CERT_PATH === 'none'
    ? undefined
    : process.env.ELASTIC_TLS_CA_CERT_PATH;

export const apmAgent = process.env.APM_ENDPOINT
  ? apm.start({
      // https://www.elastic.co/guide/en/apm/agent/nodejs/4.x/configuration.html
      active: process.env.APM_ACTIVE === 'true',
      serviceName: process.env.npm_package_name,
      serviceVersion: process.env.npm_package_version,
      serverUrl: process.env.APM_ENDPOINT,
      apiKey: process.env.ELASTICSEARCH_API_KEY,
      verifyServerCert: !!CERTIFICATE_PATH,
      serverCaCertFile: CERTIFICATE_PATH,
      environment: process.env.ENVIRONMENT ?? 'local',
      /**
       * Occasionally we are getting `APM Server transport error (ECONNRESET): socket hang up`
       * setting the log level to trace temporary to get more information
       *
       * Related to: https://github.com/alkem-io/server/issues/5127
       */
      logLevel: (process.env.APM_LOG_LEVEL as any) ?? 'warn',
      /**
       * Specify the sampling rate to use when deciding whether to trace a request.
       * This must be a value between 0.0 and 1.0, where 1.0 means 100% of requests are traced.
       * The value is rounded to four decimal places of precision (e.g. 0.0001, 0.3333) to ensure consistency and reasonable size
       * when propagating the sampling rate in the tracestate header for distributed tracing.
       *
       */
      transactionSampleRate: TRANSACTION_SAMPLE_RATE,
      /**
       * Setting this option to false will disable the Span compression feature.
       * Span compression reduces the collection, processing, and storage overhead,
       * and removes clutter from the UI. The tradeoff is that some information,
       * such as DB statements of all the compressed spans, will not be collected.
       */
      // spanCompressionEnabled: true,
      /**
       * Consecutive spans to the same destination that are under this threshold will be compressed into a single composite span.
       * This option does not apply to composite spans. This reduces the collection, processing,
       * and storage overhead, and removes clutter from the UI.
       * The tradeoff is that the DB statements of all the compressed spans will not be collected.
       */
      // spanCompressionSameKindMaxDuration: '30ms',
      /**
       * Consecutive spans that are exact match and that are under this threshold will be compressed into a single composite span.
       * This option does not apply to composite spans. This reduces the collection, processing, and storage overhead, and removes clutter from the UI.
       * The tradeoff is that the DB statements of all the compressed spans will not be collected.
       */
      // spanCompressionExactMatchMaxDuration: '50ms',
    })
  : undefined;
