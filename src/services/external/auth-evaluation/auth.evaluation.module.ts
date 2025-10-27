import { Module } from '@nestjs/common';
import {
  ClientProxyFactory,
  Transport,
  NatsOptions,
} from '@nestjs/microservices';
import { AUTH_EVALUATION_PUBLISHER } from './injection.token';
import { AuthEvaluationService } from './auth.evaluation.service';

@Module({
  providers: [
    {
      provide: AUTH_EVALUATION_PUBLISHER,
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
    AuthEvaluationService,
  ],
  exports: [AUTH_EVALUATION_PUBLISHER, AuthEvaluationService],
})
export class AuthEvaluationModule {}
