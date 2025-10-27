import {
  Inject,
  Injectable,
  LoggerService,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { firstValueFrom, map, tap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { measureLatency } from '@services/util';
import { AUTH_EVALUATION_PUBLISHER } from './injection.token';
import { LogContext } from '@common/enums';

export interface AuthEvaluationRequest {
  agentId: string;
  authorizationPolicyId: string;
  privilege: string;
}

export interface AuthEvaluationResponse {
  allowed: boolean;
  reason: string;
}

@Injectable()
export class AuthEvaluationService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(AUTH_EVALUATION_PUBLISHER) private client: ClientProxy,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public onModuleInit() {
    this.client.connect();
  }

  public onModuleDestroy() {
    this.client.close();
  }

  async evaluate(
    request: AuthEvaluationRequest
  ): Promise<AuthEvaluationResponse> {
    const result$ = this.client
      .send<AuthEvaluationResponse, AuthEvaluationRequest>('auth.evaluate', {
        agentId: request.agentId,
        authorizationPolicyId: request.authorizationPolicyId,
        privilege: request.privilege,
      })
      .pipe(
        measureLatency(),
        tap(({ latency }) =>
          this.logger.verbose?.(
            `Auth evaluation round trip took ${latency}ms`,
            LogContext.AUTH_EVALUATION
          )
        ),
        map(({ value }) => value),
        catchError(err => {
          if (err.message?.includes('no subscribers listening')) {
            this.logger.warn(
              'Auth evaluation service unavailable: no subscribers listening to "auth.evaluate"',
              LogContext.AUTH_EVALUATION
            );
            // Return a default denial response when service is unavailable
            throw new Error(
              'Authorization evaluation service is unavailable. Please ensure the auth evaluation microservice is running.'
            );
          }

          this.logger.error(
            `Error evaluating authorization: ${err.message}`,
            err.stack,
            LogContext.AUTH_EVALUATION
          );
          throw err;
        })
      );

    return firstValueFrom(result$);
  }
}
