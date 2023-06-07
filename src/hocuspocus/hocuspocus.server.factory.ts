import { FactoryProvider } from '@nestjs/common';
import { Server } from '@hocuspocus/server';
import { HOCUSPOCUS_SERVER } from '@common/constants';

export const HocuspocusServerFactoryProvider: FactoryProvider = {
  provide: HOCUSPOCUS_SERVER,
  useFactory: () => {
    Server.configure({
      port: 4001,
      quiet: true,

      async onConnect(data: any) {
        console.log('🔮connected');
      },

      async onAuthenticate() {

      }
    }).listen();
  },
  inject: [],
};
