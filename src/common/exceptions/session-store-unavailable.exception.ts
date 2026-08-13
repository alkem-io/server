import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { ExceptionDetails } from '@common/exceptions/exception.details';
import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

/**
 * The session store could not be reached, so we cannot tell whether the
 * presented session is valid.
 *
 * server#6332 — this is emphatically NOT `AuthenticationException`. The two say
 * different things and the whole feature rests on keeping them apart:
 *
 *   - `AuthenticationException` (401, UNAUTHENTICATED, 11101) means "we decided
 *     about your identity, and the answer is no". A SPA reads it as "your
 *     session is gone, sign in again" and tears the session down.
 *   - this (503, SESSION_STORE_UNAVAILABLE, 14119) means "our infrastructure
 *     failed, ask again shortly". The client retries; the cookie is re-asserted
 *     rather than cleared, so recovery needs no re-authentication.
 *
 * Conflating them meant any Redis blip presented to users as a forced logout,
 * potentially a redirect loop, rather than a five-second wobble.
 *
 * Per constitution §5 the `message` is an immutable identifier — no
 * interpolated runtime data. Anything contextual belongs in `details`, where it
 * stays queryable without leaking specifics into user-facing strings.
 */
export class SessionStoreUnavailableException extends BaseException {
  constructor(context: LogContext, details?: ExceptionDetails) {
    super(
      'session_store_unavailable',
      context,
      AlkemioErrorStatus.SESSION_STORE_UNAVAILABLE,
      details
    );

    // Apollo Server v4 reads `extensions.http.status` to override the wire HTTP
    // status. WITHOUT this line Apollo answers HTTP 200 with an errors
    // envelope, and SC-003 asserts the wire status — so this is load-bearing,
    // not decorative. Same trap `AuthenticationException` documents as
    // "Stage-1 exit log finding G".
    const ext = this.extensions as Record<string, unknown> | undefined;
    if (ext) {
      ext.http = { status: HttpStatus.SERVICE_UNAVAILABLE };
    }
  }
}
