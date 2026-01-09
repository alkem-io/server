import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  ClientProxyFactory,
  NatsOptions,
  Transport,
} from '@nestjs/microservices';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { POLICY_INVALIDATION_CLIENT } from './injection.token';
import { PolicyInvalidationPublisher } from './policy.invalidation.publisher';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: POLICY_INVALIDATION_CLIENT,
      useFactory: (configService: ConfigService<AlkemioConfig, true>) => {
        const { server_url } = configService.get('microservices.nats', {
          infer: true,
        });

        return ClientProxyFactory.create({
          transport: Transport.NATS,
          options: {
            servers: [server_url],
            waitOnFirstConnect: false,
            // No queue here: this is a publisher-only client.
          },
        } as NatsOptions);
      },
      inject: [ConfigService],
    },
    PolicyInvalidationPublisher,
  ],
  exports: [POLICY_INVALIDATION_CLIENT, PolicyInvalidationPublisher],
})
export class PolicyInvalidationModule {}
