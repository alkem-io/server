import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Injectable,
  Inject,
  Logger,
} from '@nestjs/common';
import { GqlArgumentsHost } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
@Catch()
export class HttpExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger
  ) {}

  catch(exception: any, host: ArgumentsHost) {
    const gqlHost = GqlArgumentsHost.create(host);
    const req = gqlHost.getContext().req;
    const url = req.originalUrl;

    this.logger.error(
      exception.message,
      exception.stack,
      exception.getContext()
    );

    return exception;
  }
}
