import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AlkemioSessionPayload } from './session-store.redis';

// FR-020a — authoritative absolute-TTL check. When `now > absolute_expires_at`
// the request is rejected as unauthenticated, regardless of the Redis key's
// remaining TTL. Cookie-clearing is handled by the error filter; this guard
// only enforces the invariant.
@Injectable()
export class AbsoluteTtlGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<{ alkemioSession?: AlkemioSessionPayload }>();
    const session = req.alkemioSession;
    if (!session) return true; // unauthenticated paths pass through

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (nowSeconds > session.absolute_expires_at) {
      throw new UnauthorizedException('session absolute TTL exceeded');
    }
    return true;
  }
}

export function isAbsoluteTtlExceeded(
  session: Pick<AlkemioSessionPayload, 'absolute_expires_at'>,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  return nowSeconds > session.absolute_expires_at;
}
