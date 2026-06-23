import { McpConfig } from '@src/types/alkemio.config';

export const MCP_CONFIG_DEFAULTS: McpConfig = {
  enabled: false,
  api_key_enabled: true,
  sse: {
    heartbeat_interval_ms: 30000,
    connection_timeout_ms: 300000,
  },
  rate_limit: {
    requests_per_minute: 100,
  },
  resources: {
    max_response_items: 100,
  },
};
