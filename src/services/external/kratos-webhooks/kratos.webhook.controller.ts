import { LogContext } from '@common/enums';
import { UserPasswordChangeObserverService } from '@domain/community/user-password-change/user.password.change.observer.service';
import {
  Body,
  Controller,
  Headers,
  Inject,
  LoggerService,
  Post,
  Req,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { getPayloadValidationPipe } from './get.payload.validation.pipe';
import { KratosWebhookSecretInterceptor } from './kratos.webhook.interceptor';
import { PasswordChangedWebhookPayload } from './types';

@Controller('rest/kratos')
@UseInterceptors(KratosWebhookSecretInterceptor)
export class KratosWebhookController {
  constructor(
    private readonly observerService: UserPasswordChangeObserverService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Post('password-changed')
  @UsePipes(getPayloadValidationPipe())
  public async passwordChanged(
    @Body() payload: PasswordChangedWebhookPayload,
    @Headers('user-agent') userAgent: string | undefined,
    @Req() request: { ip?: string }
  ): Promise<{ recorded: boolean }> {
    this.logger.verbose?.(
      `Kratos password-changed webhook received for identity ${payload.identityId}`,
      LogContext.KRATOS_HOOKS
    );
    return this.observerService.handleObservedPasswordChange({
      identityId: payload.identityId,
      observedAt: payload.observedAt,
      sourceFlowId: payload.flowId,
      requestContext: {
        ip: request.ip,
        userAgent,
      },
    });
  }
}
