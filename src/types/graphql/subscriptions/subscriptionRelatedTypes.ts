import { IncomingMessage, ServerResponse } from 'http';
import { Context, WebSocket as GraphqlWsWebSocket } from 'graphql-ws';

export type SubscriptionsTransportWsWebsocket = {
  upgradeReq: IncomingMessage;
  [key: string]: any;
};

export type HttpContext = {
  req: IncomingMessage;
  res: ServerResponse;
};

export interface ContextExtra {
  request: IncomingMessage;
  socket: GraphqlWsWebSocket;
}
export type WebsocketContext = Context<any, ContextExtra>;

export type ConnectionContext = HttpContext | WebsocketContext;
