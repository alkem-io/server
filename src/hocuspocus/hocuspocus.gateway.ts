import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'dgram';
import { Server } from '@hocuspocus/server';
import { UseGuards } from '@nestjs/common';
import { WsGuard } from '@core/authorization/ws.guard';

@WebSocketGateway({
  port: 4002,
  path: '',
  transports: ['websocket'],
})
export class HocuspocusGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @SubscribeMessage('message')
  handleMessage(
    @MessageBody() data: string,
    @ConnectedSocket() client: Socket
  ): string {
    return data + ' received';
  }

  afterInit(server: typeof Server): any {
    console.log('HocuspocusGateway initialized');
  }

  @UseGuards(WsGuard)
  handleConnection(client: any, ...args: any[]): any {
    console.log(`Client Connected`);
  }

  handleDisconnect(client: Socket): any {
    console.log(`Client Disconnected`);
  }

  @UseGuards(WsGuard)
  @SubscribeMessage('*')
  async handleSendMessage(client: Socket, payload: string): Promise<void> {
    console.log('new message');
  }
}
