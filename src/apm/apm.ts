// import * as apmAgent from 'elastic-apm-node/start';
import apm from 'elastic-apm-node';

export const apmAgent = apm.start({
  apiKey: '',
  serverUrl: '',
  verifyServerCert: false,
  environment: 'local',
  spanCompressionEnabled: true,
  spanCompressionSameKindMaxDuration: '50ms',
  spanCompressionExactMatchMaxDuration: '50ms',
});
