import { Session } from '@ory/kratos-client';
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
  /***
   * True if the user can only read the content and see the interactions of others users
   * but is not able to contribute
   */
  readonly: boolean;
  /***
   * The session of the user connected with the socket
   */
  session?: Session;
};
