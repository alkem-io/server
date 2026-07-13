import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { NonInteractiveLoginConfig } from './non-interactive-login.config';
import {
  NonInteractiveLoginActorIdMissingError,
  NonInteractiveLoginInvalidCredentialsError,
  NonInteractiveLoginKratosUnavailableError,
  NonInteractiveLoginRateLimitedError,
  NonInteractiveLoginService,
} from './non-interactive-login.service';
import type {
  NonInteractiveLoginRequest,
  NonInteractiveLoginResponse,
} from './non-interactive-login.types';

/**
 * `POST /api/auth/non-interactive-login`
 *
 * Credential→bearer endpoint for test harnesses and other clients that
 * cannot perform the browser-based OIDC flow. Active only when
 * `NonInteractiveLoginConfig` passes its safety gate (see
 * non-interactive-login.config.ts). When disabled, the route is still
 * mounted but every call returns 404 — no information leak about whether
 * the feature exists.
 *
 * Body: `{ email: string, password: string }`
 *
 * Responses (global HttpExceptionFilter shape — see `message` field for
 * the error code on 4xx/5xx):
 *   201 { api_token, expires_at, token_type: "Bearer" }
 *   400 message="invalid_request"   — missing fields
 *   401 message="invalid_credentials" — Kratos rejects creds (no leak
 *                                       between wrong-password and unknown
 *                                       email)
 *   404                             — feature disabled
 *   422 message="actor_id_missing"   — identity has no alkemio_actor_id
 *   429 message="rate_limited"       — Kratos rate-limited the login flow
 *   503 message="kratos_unavailable"
 */
@Controller('api/auth')
export class NonInteractiveLoginController {
  constructor(
    private readonly config: NonInteractiveLoginConfig,
    private readonly service: NonInteractiveLoginService
  ) {}

  @Post('non-interactive-login')
  async mint(
    @Body() body: NonInteractiveLoginRequest
  ): Promise<NonInteractiveLoginResponse> {
    if (!this.config.enabled) {
      // 404 — pretend the route doesn't exist. NestJS NotFoundException
      // produces the same response shape as an unmatched route.
      throw new NotFoundException();
    }

    if (
      !body ||
      typeof body.email !== 'string' ||
      typeof body.password !== 'string' ||
      body.email.length === 0 ||
      body.password.length === 0
    ) {
      // The global HttpExceptionFilter writes `message` to the response body
      // and drops everything else — use the error code as the message so
      // callers can discriminate failures by string match.
      throw new HttpException('invalid_request', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.service.mint(body.email, body.password);
    } catch (e) {
      if (e instanceof NonInteractiveLoginInvalidCredentialsError) {
        throw new HttpException('invalid_credentials', HttpStatus.UNAUTHORIZED);
      }
      if (e instanceof NonInteractiveLoginRateLimitedError) {
        throw new HttpException('rate_limited', HttpStatus.TOO_MANY_REQUESTS);
      }
      if (e instanceof NonInteractiveLoginActorIdMissingError) {
        throw new HttpException(
          'actor_id_missing',
          HttpStatus.UNPROCESSABLE_ENTITY
        );
      }
      if (e instanceof NonInteractiveLoginKratosUnavailableError) {
        throw new HttpException(
          'kratos_unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
          { cause: e }
        );
      }
      throw e;
    }
  }
}
