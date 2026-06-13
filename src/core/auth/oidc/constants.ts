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
