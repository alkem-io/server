import {
  Body,
  Controller,
  Inject,
  LoggerService,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
  ValidationPipe,
  HttpStatus,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IdentityResolutionService } from './identity-resolution.service';
import {
  IdentityResolutionRequestDto,
  IdentityResolutionResponseDto,
} from './dto';
import { LogContext } from '@common/enums';
import { Request, Response } from 'express';
import { isUUID } from 'class-validator';
import { randomUUID } from 'node:crypto';
import {
  ConflictHttpException,
  NotFoundHttpException,
  ServiceUnavailableHttpException,
} from '@common/exceptions/http';
import { DuplicateAuthIdException } from '@common/exceptions/user/duplicate.authid.exception';
import { UserIdentityNotFoundException } from '@common/exceptions/user/user.identity.not.found.exception';
import { BaseHttpException } from '@common/exceptions/http/base.http.exception';

@Controller('/rest/internal/identity')
export class IdentityResolutionController {
  private static readonly CORRELATION_HEADER = 'x-correlation-id';

  constructor(
    private readonly identityResolutionService: IdentityResolutionService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @Post('resolve')
  async resolveIdentity(
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    )
    body: IdentityResolutionRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<IdentityResolutionResponseDto> {
    const correlationId = this.resolveCorrelationId(req);
    res.setHeader(
      IdentityResolutionController.CORRELATION_HEADER,
      correlationId
    );

    // ValidationPipe ensures kratosIdentityId is defined and is a valid UUID

    this.logger?.debug?.(
      `Identity resolution controller dispatch for Kratos identity ${body.kratosIdentityId} (correlationId=${correlationId})`,
      LogContext.AUTH
    );

    try {
      const result = await this.identityResolutionService.resolveIdentity(
        body.kratosIdentityId,
        { correlationId }
      );

      return result;
    } catch (error) {
      throw this.remapException(error, correlationId, body.kratosIdentityId);
    }
  }

  private resolveCorrelationId(req: Request): string {
    const header =
      req.headers[IdentityResolutionController.CORRELATION_HEADER] ??
      req.headers['x-request-id'];

    if (typeof header === 'string' && isUUID(header, '4')) {
      return header;
    }

    if (Array.isArray(header)) {
      const candidate = header.find(value => isUUID(value, '4'));
      if (candidate) {
        return candidate;
      }
    }

    return randomUUID();
  }

  private remapException(
    error: unknown,
    correlationId: string,
    kratosIdentityId: string
  ): Error {
    const baseMessage = `Identity resolution failed for Kratos identity ${kratosIdentityId} (correlationId=${correlationId})`;

    if (error instanceof UserIdentityNotFoundException) {
      this.logger?.warn?.(
        `${baseMessage}: identity not found`,
        LogContext.AUTH
      );
      return new NotFoundHttpException(
        'Kratos identity not found.',
        LogContext.AUTH,
        'identity_not_found',
        correlationId
      );
    }

    if (error instanceof DuplicateAuthIdException) {
      this.logger?.warn?.(`${baseMessage}: duplicate authId`, LogContext.AUTH);
      return new ConflictHttpException(
        'Kratos identity already linked to another user.',
        LogContext.AUTH,
        'identity_duplicate',
        undefined,
        correlationId
      );
    }

    if (error instanceof ServiceUnavailableException) {
      this.logger?.error?.(
        baseMessage,
        error instanceof Error ? error.stack : undefined,
        LogContext.AUTH
      );
      return new ServiceUnavailableHttpException(
        'Identity resolution unavailable. Please retry.',
        LogContext.AUTH,
        'kratos_unavailable',
        undefined,
        correlationId
      );
    }

    this.logger?.error?.(
      baseMessage,
      error instanceof Error ? error.stack : undefined,
      LogContext.AUTH
    );
    return new ServiceUnavailableHttpException(
      'Identity resolution failed due to an unexpected error.',
      LogContext.AUTH,
      'identity_resolution_failed',
      { originalException: error },
      correlationId
    );
  }
}
