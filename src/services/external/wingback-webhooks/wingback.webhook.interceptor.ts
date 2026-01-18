import { LogContext } from '@common/enums';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WingbackWebhookUnauthorizedException } from '@services/external/wingback-webhooks/wingback.webhook.unauthorized.exception';
import { AlkemioConfig } from '@src/types';
import { Observable } from 'rxjs';

@Injectable()
export class HeaderInterceptor implements NestInterceptor {
  private readonly secretName: string;
  private readonly secretValue: string;

  constructor(
    private readonly configService: ConfigService<AlkemioConfig, true>
  ) {
    const { value, name } = this.configService.get(
      'licensing.wingback.webhook_secret',
      { infer: true }
    );

    this.secretName = name;
    this.secretValue = value;
  }
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const secret: string | undefined = request.headers[this.secretName];

    if (secret !== this.secretValue) {
      throw new WingbackWebhookUnauthorizedException(
        LogContext.WINGBACK_HOOKS,
        { cause: 'Secret not provided in header' }
      );
    }

    return next.handle();
  }
}
