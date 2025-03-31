import {
  Inject,
  Injectable,
  LoggerService,
  NestMiddleware,
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthenticationService } from '@core/authentication/authentication.service';

@Injectable()
export class TestMiddleware implements NestMiddleware {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly authService: AuthenticationService
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    req.user = await this.authService.getAgentInfo({
      authorization: req.headers['authorization'],
      cookie: req.cookies['ory_kratos_session'],
    });
    next();
  }
}
