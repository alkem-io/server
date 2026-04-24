import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export const CORRELATION_ID_HEADER = 'x-request-id';
export const CORRELATION_ID_PATTERN = /^[A-Za-z0-9\-_]{1,64}$/;
export const CORRELATION_ID_REQUEST_KEY = 'correlationId';

// Accepts X-Request-Id when it matches [A-Za-z0-9\-_]{1,64}; otherwise mints a
// fresh UUIDv4. Outbound HTTP clients (Hydra, Kratos, oidc-service) MUST read
// `getCorrelationId(req)` and forward it on their own X-Request-Id header.
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const headerValue = req.header(CORRELATION_ID_HEADER);
    const correlationId =
      typeof headerValue === 'string' &&
      CORRELATION_ID_PATTERN.test(headerValue)
        ? headerValue
        : randomUUID();
    setCorrelationId(req, correlationId);
    res.setHeader(CORRELATION_ID_HEADER, correlationId);
    next();
  }
}

export function setCorrelationId(req: Request, id: string): void {
  (req as Request & Record<string, unknown>)[CORRELATION_ID_REQUEST_KEY] = id;
}

export function getCorrelationId(req: Request): string | undefined {
  const v = (req as Request & Record<string, unknown>)[
    CORRELATION_ID_REQUEST_KEY
  ];
  return typeof v === 'string' ? v : undefined;
}
