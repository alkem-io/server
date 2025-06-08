import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationPrivilege } from '@common/enums';

/**
 * Options not available through the API, but used internally.
 * These options are a result of the initialization process of the DataLoaderCreator and should not be used directly.
 */
// todo: maybe not needed at all
export type DataLoaderCreatorSystemOptions = {
  /**
   * The AgentInfo of the user that initiated the request.
   * If passed it is used to authorize the results against the AgentInfo.
   * Add by the decorator automatically if the `checkPrivilege` option is set to true.
   */
  agentInfo?: AgentInfo; // todo: is this needed?
};

/**
 * Options for DataLoaderCreator that are used to authorize the results
 */
export type DataLoaderCreatorAuthOptions = {};
