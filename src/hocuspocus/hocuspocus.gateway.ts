import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';

@WebSocketGateway(4002, {
  cors: {
    origin: '*',
  },
})
export class HocuspocusGateway {
  @SubscribeMessage('message')
  handleMessage(@MessageBody() data: string): string {
    return data + ' received';
  }
}
