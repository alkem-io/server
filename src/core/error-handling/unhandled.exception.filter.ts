import { randomUUID } from 'crypto';
import { ExceptionFilter, Catch, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Catch(Error)
export class UnhandledExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  catch(exception: Error) {
    /* add values that you want to include as additional data
     e.g. secondParam = { code: '123' };
    */
    const secondParam = { errorId: randomUUID() };
    const thirdParam = undefined;
    /* the logger will handle the passed exception by iteration over all it's fields
     * you can provide additional data in the stack and context
     */
    this.logger.error(exception, secondParam, thirdParam);
    // something needs to be returned so the default ExceptionsHandler is not triggered
    return exception;
  }
}
