import {
  Body,
  Controller,
  Inject,
  LoggerService,
  Post,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { WingbackContractPayload } from './types';
import { WingbackWebhookService } from './wingback.webhook.service';
import { HeaderInterceptor } from './wingback.webhook.interceptor';
import { ValidationError } from 'class-validator';
import { BadRequestHttpException } from '@common/exceptions/http';

const pipe = () => {
  const exceptionFactory = (errors: ValidationError[]) => {
    const details = errors.reduce(
      (acc, { property, constraints }) => {
        acc[property] = {
          ...acc[property],
          constraints: { ...acc[property]?.['constraints'], ...constraints },
        };
        return acc;
      },
      {} as Record<string, any>
    );
    return new BadRequestHttpException(
      'Invalid data provided in payload',
      LogContext.WINGBACK_HOOKS,
      details
    );
  };

  return new ValidationPipe({ exceptionFactory });
};

@Controller('rest/wingback')
@UseInterceptors(HeaderInterceptor)
export class WingbackWebhookController {
  constructor(
    private readonly handlers: WingbackWebhookService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}
  // v1.contract.change.completed
  @Post('contract/changed')
  @UsePipes(new ValidationPipe())
  public contractChanged(@Body() payload: WingbackContractPayload): void {
    this.logger.verbose?.(
      `Wingback "v1.contract.change.completed" event received for contract: "${payload.id}"`,
      LogContext.WINGBACK_HOOKS
    );
    this.handlers.contractChanged(payload);
  }
  // v1.contract.signature.completed
  @Post('contract/signed')
  @UsePipes(pipe())
  public newContract(@Body() payload: WingbackContractPayload): void {
    this.logger.verbose?.(
      `Wingback "v1.contract.signature.completed" event received for contract: "${payload.id}"`,
      LogContext.WINGBACK_HOOKS
    );
    this.handlers.newContract(payload);
  }
}
