import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  ClientProxyFactory,
  Transport,
  NatsOptions,
} from '@nestjs/microservices';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { AUTH_REMOTE_EVALUATION_CLIENT } from './injection.token';
import { AuthRemoteEvaluationService } from './auth.remote.evaluation.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: AUTH_REMOTE_EVALUATION_CLIENT,
      useFactory: (configService: ConfigService<AlkemioConfig, true>) => {
        const { server_url } = configService.get('microservices.nats', {
          infer: true,
        });
        const { queue_name } = configService.get(
          'microservices.auth_evaluation',
          { infer: true }
        );
        return ClientProxyFactory.create({
          transport: Transport.NATS,
          options: {
            servers: [server_url],
            waitOnFirstConnect: false,
            queue: queue_name,
          },
        } as NatsOptions);
      },
      inject: [ConfigService],
    },
    AuthRemoteEvaluationService,
  ],
  exports: [AUTH_REMOTE_EVALUATION_CLIENT, AuthRemoteEvaluationService],
})
export class AuthRemoteEvaluationModule {}
