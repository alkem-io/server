import { NIL as NIL_UUID } from 'uuid';

export const HEADER_ACTOR_ID = 'X-Alkemio-Actor-Id';

/** auth-evaluation-service interprets the nil UUID as the anonymous caller
(see authorization-evaluation-service/internal/service/validation.go).
Downstream middlewares (e.g. file-service-go's ActorHeaderExtractor) require
`X-Alkemio-Actor-Id` to ALWAYS be present so they can distinguish
"gateway stamped: anonymous" from "gateway didn't run". Emitting this fixed
value for un-credentialed traffic keeps the contract uniform while letting
auth-eval still resolve GLOBAL_ANONYMOUS for public-read privileges.
 */
export const ANONYMOUS_ACTOR_ID = NIL_UUID;

/**
 * Non-persisted transport identity for a named guest. Only ForwardAuth emits
 * this value; authorization-evaluation-service maps it to global-guest.
 */
export const GUEST_ACTOR_ID = '00000000-0000-0000-0000-000000000001';

/**
 * workspace#079-app-sso-handoff FR-008 — the verifier for a native sign-in
 * handoff travels in this REQUEST HEADER, never in a URL: a query parameter is
 * already in the access log, the reverse-proxy log and every APM span by the
 * time a handler runs.
 *
 * Node lowercases incoming header names, so the handler reads
 * `req.headers[APP_VERIFIER_HEADER.toLowerCase()]` — which is what makes the
 * canonical mixed-case spelling the shell sends load-bearing here rather than
 * a literal that only a cross-repo grep ever reads.
 */
export const APP_VERIFIER_HEADER = 'X-Alkemio-App-Verifier';
