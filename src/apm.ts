// eslint-disable-next-line @typescript-eslint/no-var-requires
export const apm = require('elastic-apm-node').start({
  apiKey: '',
  serverUrl: '',
  verifyServerCert: false,
  environment: 'local',
});
