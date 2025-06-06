import { AgentInfo } from '@core/authentication.agent.info/agent.info';

/**
 * Options not available through the API, but used internally.
 * These options are a result of the initialization process of the DataLoaderCreator and should not be used directly.
 */
export type DataLoaderCreatorSystemOptions = {
  /**
   * The AgentInfo of the user that initiated the request.
   * If passed it is used to authorize the results against the AgentInfo.
   * Add by the decorator automatically if the `checkPrivilege` option is set to true.
   */
  agentInfo?: AgentInfo;
};
