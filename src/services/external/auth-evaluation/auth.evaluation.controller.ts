import { LogContext } from '@common/enums';
import { Controller, Inject } from '@nestjs/common/decorators';
import {
  Ctx,
  MessagePattern,
  NatsContext,
  Payload,
  Transport,
} from '@nestjs/microservices';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';

@Controller()
export class AuthEvaluationController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger
  ) {}

  @MessagePattern('auth.evaluate', Transport.NATS)
  public async authEvaluationResponse(
    @Payload() payload: any,
    @Ctx() context: NatsContext
  ) {
    this.logger.verbose?.(
      `Subject: ${context.getSubject()}`,
      LogContext.AUTH_EVALUATION
    );
  }
}
