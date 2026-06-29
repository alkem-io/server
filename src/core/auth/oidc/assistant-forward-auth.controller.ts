import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import type { Request, Response } from 'express';
import { ANONYMOUS_ACTOR_ID, HEADER_ACTOR_ID } from './constants';
import {
  ForwardAuthResolverService,
  SessionStoreUnavailableError,
} from './forward-auth.resolver.service';

/**
 * 004-web-ai-assistant (FR-027, T037d): the server-side **assistant edge**
 * forwardAuth decision endpoint.
 *
 * Mounted under `/rest/internal/*` (same as the universal forwardAuth endpoint)
 * so it is unreachable from the public internet — only the Traefik
 * `alkemio-resolve-assistant` ForwardAuth middleware reaches it. The Traefik
 * router for `/api/private/rest/assistant` points its ForwardAuth here instead
 * of the universal `/rest/internal/forward-auth`.
 *
 * Unlike the universal endpoint (which ALWAYS returns 200), this one is the
 * PRIMARY access gate for the web AI assistant:
 *   - Resolves the acting ActorContext from the SAME identity sources (cookie /
 *     Hydra bearer / non-interactive-login bearer / guest) via the universal
 *     controller's `resolveActorContext`.
 *   - If the resolved actor holds `ACCESS_VIRTUAL_ASSISTANT` on the Platform
 *     authorization policy → 200 + stamps `X-Alkemio-Actor-Id`, so the request
 *     proceeds to assistant-service.
 *   - Otherwise → **403** (`permission_denied`) BEFORE assistant-service is
 *     reached. An anonymous caller never holds the privilege, so it is refused
 *     too.
 *
 * Flow B (`/internal/invoke`, system-invoked) does NOT traverse this browser
 * edge / the `alkemio-resolve-assistant` middleware, so it is exempt by
 * construction — there is no user and no privilege gate on that path.
 */
@Controller('rest/internal')
export class AssistantForwardAuthController {
  constructor(
    private readonly forwardAuthResolverService: ForwardAuthResolverService,
    private readonly authorizationService: AuthorizationService,
    private readonly platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @Get('assistant-forward-auth')
  async resolve(
    @Query('guestName') guestNameRaw: string | undefined,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    res.setHeader('Cache-Control', 'no-store');

    const guestName =
      typeof guestNameRaw === 'string' ? guestNameRaw : undefined;

    let actorContext;
    try {
      actorContext = await this.forwardAuthResolverService.resolveActorContext(
        req,
        guestName
      );
    } catch (err) {
      if (err instanceof SessionStoreUnavailableError) {
        res.status(503).end();
        return;
      }
      throw err;
    }

    const hasAccess = this.authorizationService.isAccessGranted(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.ACCESS_VIRTUAL_ASSISTANT
    );

    if (!hasAccess) {
      // Primary access gate: refuse before assistant-service is reached.
      res.status(403).end();
      return;
    }

    res.setHeader(
      HEADER_ACTOR_ID,
      actorContext.actorID && actorContext.actorID.length > 0
        ? actorContext.actorID
        : ANONYMOUS_ACTOR_ID
    );
    res.status(200).end();
  }
}
