import { Session } from '@ory/kratos-client';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';

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
   * The timestamp of the last presence received;
   * These events are received with the 'server-volatile-broadcast' event
   */
  lastPresence: number;
  /***
   * True if the user can read the content and see the interactions of others users
   */
  read: boolean;
  /***
   * If the user can update the content of the whiteboard
   */
  update: boolean;
  /***
   * The session of the user connected with the socket
   */
  session?: Session;
};
