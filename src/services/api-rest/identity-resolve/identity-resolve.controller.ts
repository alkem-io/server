import {
  Body,
  Controller,
  HttpCode,
  Inject,
  LoggerService,
  Post,
  Req,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IdentityResolveService } from './identity-resolve.service';
import { IdentityResolveRequestDto } from './dto/identity-resolve.request.dto';
import { IdentityResolveResponseDto } from './dto/identity-resolve.response.dto';
import { Request } from 'express';
import { LogContext } from '@common/enums';

@Controller('/rest/internal/identity')
export class IdentityResolveController {
  constructor(
    private readonly identityResolveService: IdentityResolveService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @Post('resolve')
  @HttpCode(200)
  async resolveIdentity(
    @Body() body: IdentityResolveRequestDto,
    @Req() req: Request
  ): Promise<IdentityResolveResponseDto> {
    this.logger.debug?.(
      `Identity resolve request received for authenticationId=${body.authenticationId} from ip=${req.ip}`,
      LogContext.AUTH
    );

    const user = await this.identityResolveService.resolveUser(
      body.authenticationId,
      {
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      }
    );

    return {
      userId: user.id,
      agentId: user.agent.id,
    };
  }
}
