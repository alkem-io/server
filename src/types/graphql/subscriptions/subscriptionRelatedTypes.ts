import { ActorContext } from '@core/actor-context/actor.context';
import { Context, WebSocket as GraphqlWsWebSocket } from 'graphql-ws';
import { IncomingMessage, ServerResponse } from 'http';

export type SubscriptionsTransportWsWebsocket = {
  upgradeReq: IncomingMessage;
  [key: string]: any;
};

export type HttpContext = {
  req: IncomingMessage & { user: ActorContext };
  res: ServerResponse;
};

export interface ContextExtra {
  request: IncomingMessage;
  socket: GraphqlWsWebSocket;
}
export type WebsocketContext = Context<any, ContextExtra>;

export type ConnectionContext = HttpContext | WebsocketContext;
