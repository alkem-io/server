import { AgentInfo } from '@core/authentication';

export type SocketData = {
  /***
   * The info of the user connected with the socket
   */
  agentInfo: AgentInfo;
  /***
   * The timestamp of the last contribution event received;
   * The events are the ones received on the server-broadcast channel
   */
  lastContributed: number;
};
