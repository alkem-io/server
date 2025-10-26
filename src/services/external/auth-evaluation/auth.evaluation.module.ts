import { Module } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { AUTH_EVALUATION_PUBLISHER } from './injection.token';
import { AuthEvaluationController } from './auth.evaluation.controller';

@Module({
  providers: [
    {
      provide: AUTH_EVALUATION_PUBLISHER,
      useFactory: () => {
        return ClientProxyFactory.create({
          transport: Transport.NATS,
          options: {
            url: 'nats://localhost:4222',
            // queue: 'alkemio-auth-evaluate',
          },
        });
      },
    },
  ],
  controllers: [AuthEvaluationController],
  exports: [AUTH_EVALUATION_PUBLISHER],
})
export class AuthEvaluationModule {}
