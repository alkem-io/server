import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  ClientProxyFactory,
  Transport,
  NatsOptions,
} from '@nestjs/microservices';
import { AUTH_REMOTE_EVALUATION_CLIENT } from './injection.token';
import { AuthRemoteEvaluationService } from './auth.remote.evaluation.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: AUTH_REMOTE_EVALUATION_CLIENT,
      useFactory: () => {
        return ClientProxyFactory.create({
          transport: Transport.NATS,
          options: {
            servers: ['nats://localhost:4222'],
            waitOnFirstConnect: false,
            queue: 'alkemio-auth-evaluation',
          },
        } as NatsOptions);
      },
    },
    AuthRemoteEvaluationService,
  ],
  exports: [AUTH_REMOTE_EVALUATION_CLIENT, AuthRemoteEvaluationService],
})
export class AuthRemoteEvaluationModule {}
