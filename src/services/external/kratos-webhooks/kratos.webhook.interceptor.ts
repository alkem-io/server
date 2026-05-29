import { LogContext } from '@common/enums';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { Observable } from 'rxjs';
import { KratosWebhookUnauthorizedException } from './kratos.webhook.unauthorized.exception';

/**
 * Shared-secret header check for Kratos-driven webhooks. The expected secret
 * name + value are configured on the Kratos webhook (jsonnet body or
 * `auth.config.value`) and read here from the server config. Mirrors the
 * wingback-webhooks interceptor pattern so kratos-hooks and the server share
 * the same operational contract.
 */
@Injectable()
export class KratosWebhookSecretInterceptor implements NestInterceptor {
  private readonly secretName: string;
  private readonly secretValue: string;

  constructor(
    private readonly configService: ConfigService<AlkemioConfig, true>
  ) {
    const { name, value } = this.configService.get(
      'identity.authentication.providers.ory.webhook_secret',
      { infer: true }
    );
    // Express normalizes incoming header keys to lowercase, so the configured
    // header name must be lowercased before indexing into request.headers.
    this.secretName = name.toLowerCase();
    this.secretValue = value;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const secret: string | undefined = request.headers[this.secretName];

    if (!this.secretValue || secret !== this.secretValue) {
      throw new KratosWebhookUnauthorizedException(LogContext.KRATOS_HOOKS, {
        cause: 'Secret not provided or did not match',
      });
    }

    return next.handle();
  }
}
